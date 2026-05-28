import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  identityService: {
    buildIdentityRegistration: vi.fn(),
  },
  transactionService: {
    addSignerSignature: vi.fn(),
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

vi.mock('../../../domains/identity/applicationService', () => ({
  buildIdentityRegistration: (...args: any[]) =>
    mocks.identityService.buildIdentityRegistration(...args),
}))

vi.mock('../../../domains/transaction/applicationService', () => ({
  addSignerSignature: (...args: any[]) => mocks.transactionService.addSignerSignature(...args),
  sendTransaction: (...args: any[]) => mocks.transactionService.sendTransaction(...args),
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  createChainAddress: (...args: any[]) => mocks.accountService.createChainAddress(...args),
  generateWalletKeyPair: (...args: any[]) => mocks.accountService.generateWalletKeyPair(...args),
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  fetchCommonWalletDocs: (...args: any[]) => mocks.walletService.fetchCommonWalletDocs(...args),
  insertIdentity: (...args: any[]) => mocks.walletService.insertIdentity(...args),
}))

import {
  createIdentityRegistrationDraft,
  loadIdentityPayerWalletOptions,
  persistCreatedIdentity,
  submitIdentityRegistration,
} from './createIdentityApplicationService'
import type { CommonWallet, HardwareWallet, IdentityControl } from '../../../shared/lib/types'

function makeCommonWallet(overrides: Partial<CommonWallet> = {}): CommonWallet {
  return {
    address: 'AQ123',
    key: 'wallet-key',
    label: 'Payer Wallet',
    publicKey: 'pk',
    salt: 'salt',
    algorithm: 'aes-256-gcm',
    parameters: { curve: 'p256' },
    scrypt: {},
    ...overrides,
  }
}

function makeHardwareWallet(overrides: Partial<HardwareWallet> = {}): HardwareWallet {
  return {
    address: 'AQLEDGER',
    label: 'Ledger Wallet',
    publicKey: 'ledger-pk',
    neo: 0,
    acct: 0,
    ...overrides,
  }
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
        payerWalletType: 'ledgerWallet',
        payerWallet: undefined,
        payerPassword: '',
        ledgerWallet: makeHardwareWallet({ address: '', label: '', publicKey: '' }),
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

    mocks.transactionService.addSignerSignature.mockResolvedValue(signedTx)
    mocks.transactionService.sendTransaction.mockResolvedValue({ ok: true, txHash: 'hash-1' })

    await expect(
      submitIdentityRegistration({
        tx,
        payerWalletType: 'commonWallet',
        payerWallet: makeCommonWallet(),
        payerPassword: 'secret123',
        ledgerWallet: undefined,
      })
    ).resolves.toEqual({ ok: true, txHash: 'hash-1' })

    expect(mocks.transactionService.addSignerSignature).toHaveBeenCalledWith({
      tx,
      wallet: {
        address: 'AQ123',
        key: 'wallet-key',
        label: 'Payer Wallet',
        publicKey: 'pk',
        salt: 'salt',
        algorithm: 'aes-256-gcm',
        parameters: { curve: 'p256' },
        scrypt: {},
      },
      password: 'secret123',
    })
    expect(mocks.transactionService.sendTransaction).toHaveBeenCalledWith(signedTx)
  })

  it('maps missing common-wallet signatures to a password error', async () => {
    mocks.transactionService.addSignerSignature.mockResolvedValue(null)

    await expect(
      submitIdentityRegistration({
        tx: { id: 'tx-1' },
        payerWalletType: 'commonWallet',
        payerWallet: makeCommonWallet(),
        payerPassword: 'wrong-password',
        ledgerWallet: undefined,
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
