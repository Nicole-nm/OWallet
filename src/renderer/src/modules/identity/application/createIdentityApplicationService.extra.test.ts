import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  identityService: { buildIdentityRegistration: vi.fn() },
  transactionService: { sendTransaction: vi.fn() },
  accountService: { createSdkAddress: vi.fn(), generateWalletKeyPair: vi.fn() },
  walletService: { fetchCommonWalletDocs: vi.fn(), insertIdentity: vi.fn() },
}))

vi.mock('../../../domains/identity/identityDomainService', () => ({
  buildIdentityRegistration: (...args: unknown[]) =>
    mocks.identityService.buildIdentityRegistration(...args),
}))

vi.mock('../../../domains/transaction/transactionDomainService', () => ({
  sendTransaction: (...args: unknown[]) => mocks.transactionService.sendTransaction(...args),
}))

vi.mock('../../../shared/chain/walletSdk', () => ({
  createSdkAddress: (...args: unknown[]) => mocks.accountService.createSdkAddress(...args),
  generateWalletKeyPair: (...args: unknown[]) =>
    mocks.accountService.generateWalletKeyPair(...args),
}))

vi.mock('../../../domains/wallet/walletDomainService', () => ({
  fetchCommonWalletDocs: (...args: unknown[]) => mocks.walletService.fetchCommonWalletDocs(...args),
  insertIdentity: (...args: unknown[]) => mocks.walletService.insertIdentity(...args),
}))

import {
  createIdentityRegistrationDraft,
  loadIdentityPayerWalletOptions,
  persistCreatedIdentity,
  submitIdentityRegistration,
} from './createIdentityApplicationService'
import type { WalletAdapter, WalletCapabilities } from '../../../domains/wallet/adapter'

const ledgerCapabilities: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

function makeLedgerAdapter(address = 'AQledger'): WalletAdapter {
  return {
    identity: { type: 'ledger', address, publicKey: 'pk', label: 'L' },
    capabilities: ledgerCapabilities,
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    addSignature: vi.fn().mockResolvedValue('signed-tx'),
  } as WalletAdapter
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadIdentityPayerWalletOptions edge cases', () => {
  it('returns an empty list for non-array results', async () => {
    mocks.walletService.fetchCommonWalletDocs.mockResolvedValue(null)
    await expect(loadIdentityPayerWalletOptions()).resolves.toEqual({ ok: true, options: [] })
  })

  it('returns the failure fallback when the query throws', async () => {
    mocks.walletService.fetchCommonWalletDocs.mockRejectedValue(new Error('db down'))
    const result = await loadIdentityPayerWalletOptions()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorKey).toBe('common.savedbFailed')
      expect(result.options).toEqual([])
    }
  })

  it('maps a flat wallet without a nested wallet field', async () => {
    mocks.walletService.fetchCommonWalletDocs.mockResolvedValue([{ address: 'AQflat' }])
    const result = await loadIdentityPayerWalletOptions()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.options[0]).toMatchObject({
        address: 'AQflat',
        value: 'AQflat',
        label: 'AQflat',
        publicKey: '',
      })
    }
  })
})

describe('createIdentityRegistrationDraft guards', () => {
  it('rejects a common wallet without an address', async () => {
    await expect(
      createIdentityRegistrationDraft({
        label: 'x',
        payerWalletType: 'commonWallet',
        payerWallet: undefined,
      })
    ).resolves.toEqual({ ok: false, errorKey: 'createIdentity.selectOneWallet' })
  })

  it('warns when a ledger wallet is not connected', async () => {
    await expect(
      createIdentityRegistrationDraft({
        label: 'x',
        payerWalletType: 'ledgerWallet',
        ledgerWallet: undefined,
      })
    ).resolves.toEqual({ ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' })
  })

  it('builds the draft for a connected ledger wallet with a default password', async () => {
    mocks.accountService.createSdkAddress.mockResolvedValue('sdk-address')
    mocks.accountService.generateWalletKeyPair.mockResolvedValue({ privateKey: 'priv' })
    mocks.identityService.buildIdentityRegistration.mockResolvedValue({
      label: 'L',
      ontid: 'did:ont:l',
      identity: { ontid: 'did:ont:l', label: 'L', controls: [] },
      tx: { id: 'tx' },
    })

    const result = await createIdentityRegistrationDraft({
      label: 'L',
      payerWalletType: 'ledgerWallet',
      ledgerWallet: { address: 'AQledger' } as never,
    })

    expect(result.ok).toBe(true)
    expect(mocks.identityService.buildIdentityRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ password: '', gasPrice: '2500' })
    )
  })
})

describe('submitIdentityRegistration guards', () => {
  it('rejects a missing transaction', async () => {
    await expect(
      submitIdentityRegistration({ tx: undefined, adapter: makeLedgerAdapter() })
    ).resolves.toEqual({ ok: false, errorKey: 'common.networkErr' })
  })

  it('warns when the ledger device has no address', async () => {
    await expect(
      submitIdentityRegistration({
        tx: { id: 'tx' },
        adapter: makeLedgerAdapter(''),
        ledgerConnected: true,
      })
    ).resolves.toEqual({ ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' })
  })

  it('submits through a connected ledger device', async () => {
    mocks.transactionService.sendTransaction.mockResolvedValue({ ok: true, txHash: 'hash' })
    const adapter = makeLedgerAdapter('AQledger')
    const result = await submitIdentityRegistration({
      tx: { id: 'tx' },
      adapter,
      ledgerConnected: true,
    })
    expect(result).toEqual({ ok: true, txHash: 'hash' })
  })
})

describe('persistCreatedIdentity guards', () => {
  it('rejects when ontid or identity is missing', async () => {
    await expect(
      persistCreatedIdentity({ ontid: '', identity: undefined as never })
    ).resolves.toEqual({ ok: false, errorKey: 'common.savedbFailed' })
  })

  it('returns the failure fallback when insertion throws', async () => {
    mocks.walletService.insertIdentity.mockRejectedValue(new Error('db'))
    const result = await persistCreatedIdentity({
      ontid: 'did:ont:l',
      identity: { ontid: 'did:ont:l', label: 'L', controls: [] } as never,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errorKey).toBe('common.savedbFailed')
  })
})
