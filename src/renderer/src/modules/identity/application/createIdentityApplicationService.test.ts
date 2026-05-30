import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  identityService: {
    buildIdentityRegistration: vi.fn(),
  },
  transactionService: {
    sendTransaction: vi.fn(),
  },
  accountService: {
    createChainAddress: vi.fn(),
    generateWalletKeyPair: vi.fn(),
  },
  walletService: {
    fetchCommonWalletDocs: vi.fn(),
    insertIdentity: vi.fn(),
  },
}))

vi.mock('../../../domains/identity/identityDomainService', () => ({
  buildIdentityRegistration: (...args: any[]) =>
    mocks.identityService.buildIdentityRegistration(...args),
}))

vi.mock('../../../domains/transaction/transactionDomainService', () => ({
  sendTransaction: (...args: any[]) => mocks.transactionService.sendTransaction(...args),
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  createChainAddress: (...args: any[]) => mocks.accountService.createChainAddress(...args),
  generateWalletKeyPair: (...args: any[]) => mocks.accountService.generateWalletKeyPair(...args),
}))

vi.mock('../../../domains/wallet/walletDomainService', () => ({
  fetchCommonWalletDocs: (...args: any[]) => mocks.walletService.fetchCommonWalletDocs(...args),
  insertIdentity: (...args: any[]) => mocks.walletService.insertIdentity(...args),
}))

import {
  createIdentityRegistrationDraft,
  loadIdentityPayerWalletOptions,
  persistCreatedIdentity,
  submitIdentityRegistration,
} from './createIdentityApplicationService'
import type { CommonWallet, IdentityControl } from '../../../shared/lib/types'
import type { WalletAdapter, WalletCapabilities } from '../../../domains/wallet/adapter'

const commonCapabilities: WalletCapabilities = {
  requiresPassword: true,
  requiresHardwareDevice: false,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

const ledgerCapabilities: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

function makeAdapter(
  capabilities: WalletCapabilities,
  addSignatureResult: unknown = 'signed-tx',
  address = 'AQ123'
): WalletAdapter {
  return {
    identity: {
      type: capabilities.requiresPassword ? 'common' : 'ledger',
      address,
      publicKey: 'pk',
      label: 'L',
    },
    capabilities,
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    addSignature: vi.fn().mockResolvedValue(addSignatureResult),
  } as WalletAdapter
}

import { createFakeCommonWallet } from '../../../shared/chain/__fixtures__/fakeWallet'

function makeCommonWallet(overrides: Partial<CommonWallet> = {}): CommonWallet {
  return createFakeCommonWallet({
    address: 'AQ123',
    key: 'wallet-key',
    label: 'Payer Wallet',
    publicKey: 'pk',
    salt: 'salt',
    algorithm: 'aes-256-gcm',
    parameters: { curve: 'p256' },
    scrypt: {},
    ...overrides,
  })
}

describe('createIdentityApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps local common wallets to select options', async () => {
    mocks.walletService.fetchCommonWalletDocs.mockResolvedValue([
      {
        address: 'AQ123',
        wallet: {
          address: 'AQ123',
          label: 'Main Wallet',
          key: 'encrypted-key',
          publicKey: 'pk',
          salt: 'salt',
          algorithm: 'aes-256-gcm',
          parameters: { curve: 'p256' },
          scrypt: {},
        } satisfies CommonWallet,
      },
    ])

    await expect(loadIdentityPayerWalletOptions()).resolves.toEqual({
      ok: true,
      options: [
        {
          address: 'AQ123',
          key: 'encrypted-key',
          label: 'Main Wallet AQ123',
          value: 'AQ123',
          publicKey: 'pk',
          salt: 'salt',
          algorithm: 'aes-256-gcm',
          parameters: { curve: 'p256' },
          scrypt: {},
        },
      ],
    })
  })

  it('creates identity registration drafts using the selected payer wallet address', async () => {
    const privateKey = { id: 'pk-1' }
    const tx = { id: 'tx-1' }

    mocks.accountService.createChainAddress.mockResolvedValue('sdk-address')
    mocks.accountService.generateWalletKeyPair.mockResolvedValue({ privateKey })
    mocks.identityService.buildIdentityRegistration.mockResolvedValue({
      label: 'Alice',
      ontid: 'did:ont:alice',
      identity: { ontid: 'did:ont:alice', label: 'Alice', controls: [] },
      tx,
    })

    await expect(
      createIdentityRegistrationDraft({
        label: 'Alice',
        password: 'secret123',
        payerWalletType: 'commonWallet',
        payerWallet: makeCommonWallet(),
        ledgerWallet: undefined,
      })
    ).resolves.toEqual({
      ok: true,
      label: 'Alice',
      ontid: 'did:ont:alice',
      identity: { ontid: 'did:ont:alice', label: 'Alice', controls: [] },
      tx,
    })

    expect(mocks.accountService.createChainAddress).toHaveBeenCalledWith('AQ123')
    expect(mocks.identityService.buildIdentityRegistration).toHaveBeenCalledWith({
      label: 'Alice',
      privateKey,
      password: 'secret123',
      payer: 'sdk-address',
    })
  })

  it('requires a connected ledger wallet when submitting through ledger', async () => {
    await expect(
      submitIdentityRegistration({
        tx: { id: 'tx-1' },
        adapter: makeAdapter(ledgerCapabilities, 'signed-tx', ''),
        payerPassword: '',
        ledgerConnected: false,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })
  })

  it('signs and sends identity registration transactions with common wallet credentials', async () => {
    const tx = { id: 'tx-1' }
    const signedTx = { id: 'signed-tx' }

    mocks.transactionService.sendTransaction.mockResolvedValue({ ok: true, txHash: 'hash-1' })

    const adapter = makeAdapter(commonCapabilities, signedTx)
    await expect(
      submitIdentityRegistration({
        tx,
        adapter,
        payerPassword: 'secret123',
      })
    ).resolves.toEqual({ ok: true, txHash: 'hash-1' })

    expect(adapter.addSignature).toHaveBeenCalledWith(tx, { password: 'secret123' })
    expect(mocks.transactionService.sendTransaction).toHaveBeenCalledWith(signedTx)
  })

  it('maps missing common-wallet signatures to a password error', async () => {
    await expect(
      submitIdentityRegistration({
        tx: { id: 'tx-1' },
        adapter: makeAdapter(commonCapabilities, null),
        payerPassword: 'wrong-password',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })

    expect(mocks.transactionService.sendTransaction).not.toHaveBeenCalled()
  })

  it('persists created identities as local identity records', async () => {
    mocks.walletService.insertIdentity.mockResolvedValue({ ok: true })

    await expect(
      persistCreatedIdentity({
        ontid: 'did:ont:alice',
        identity: { ontid: 'did:ont:alice', label: 'Alice', controls: [] as IdentityControl[] },
      })
    ).resolves.toEqual({ ok: true })

    expect(mocks.walletService.insertIdentity).toHaveBeenCalledWith({
      type: 'Identity',
      address: 'did:ont:alice',
      wallet: { ontid: 'did:ont:alice', label: 'Alice', controls: [] as IdentityControl[] },
    })
  })
})
