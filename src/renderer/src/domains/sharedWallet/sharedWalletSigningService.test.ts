import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  transactionSdk: {
    deserializeTransaction: vi.fn(),
    signTransactionMultiSig: vi.fn(),
    tryDecryptWallet: vi.fn(),
  },
  ledgerSigner: {
    checkPublicKeyIsInTheConnectedLedger: vi.fn(),
    legacySignWithLedger: vi.fn(),
  },
  signingService: {
    sendTx: vi.fn(),
    signSharedTx: vi.fn(),
    signSharedTxWithLedger: vi.fn(),
  },
  serializationService: {
    serializeTx: vi.fn(),
  },
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_LIMIT: '20000',
  GAS_PRICE: '500',
  getOntPassHost: vi.fn(() => 'https://node.example'),
  ONT_PASS_API_PATHS: {
    CreateSharedTransfer: '/create',
    CreateSharedWallet: '/wallet',
    QueryPendingTransfer: '/pending',
    QuerySharedWallet: '/query',
    SignSharedTransfer: '/sign',
  },
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: mocks.httpClient,
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  deserializeTransaction: (...args: any[]) => mocks.transactionSdk.deserializeTransaction(...args),
  signTransactionMultiSig: (...args: any[]) =>
    mocks.transactionSdk.signTransactionMultiSig(...args),
  tryDecryptWallet: (...args: any[]) => mocks.transactionSdk.tryDecryptWallet(...args),
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: vi.fn((value) => value),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: any[]) =>
    mocks.ledgerSigner.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: any[]) => mocks.ledgerSigner.legacySignWithLedger(...args),
}))

vi.mock('../transaction/signingService', () => ({
  sendTx: (...args: any[]) => mocks.signingService.sendTx(...args),
  signSharedTx: (...args: any[]) => mocks.signingService.signSharedTx(...args),
  signSharedTxWithLedger: (...args: any[]) => mocks.signingService.signSharedTxWithLedger(...args),
}))

vi.mock('../transaction/serializationService', () => ({
  serializeTx: (...args: any[]) => mocks.serializationService.serializeTx(...args),
}))

import { submitPendingSharedSignature } from './sharedWalletSigningService'

describe('sharedWalletSigningService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitPendingSharedSignature', () => {
    it('collects a partial signature and does not submit to chain when threshold is not met', async () => {
      // M=2, only 1 sig after signing → threshold not met
      const sigData: string[] = ['existing-sig']
      const fakeTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }

      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(fakeTx)
      mocks.transactionSdk.tryDecryptWallet.mockResolvedValue({ key: 'private-key' })
      mocks.transactionSdk.signTransactionMultiSig.mockResolvedValue(undefined)
      mocks.serializationService.serializeTx.mockReturnValue('serialized-tx')
      // Server accepts the partial signature
      mocks.httpClient.post.mockResolvedValue({ Error: 0 })

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        currentSigner: {
          type: 'CommonWallet',
          key: 'encrypted-key',
          address: 'AQ123',
          salt: 'salt',
        },
        password: 'correct-password',
      })

      expect(result).toEqual({ ok: true, sentToChain: false })
      expect(mocks.signingService.sendTx).not.toHaveBeenCalled()
    })

    it('auto-submits to chain when signature threshold is reached', async () => {
      // M=2, sigData already has 1 sig; after adding the second the threshold is met
      const sigData: string[] = ['first-sig']
      const fakeTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'final-tx-hash'),
      }

      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(fakeTx)
      mocks.transactionSdk.tryDecryptWallet.mockResolvedValue({ key: 'private-key' })
      // signTransactionMultiSig pushes a signature into sigData
      mocks.transactionSdk.signTransactionMultiSig.mockImplementation((tx: any) => {
        tx.sigs[0].sigData.push('second-sig')
      })
      mocks.serializationService.serializeTx.mockReturnValue('serialized-tx')
      mocks.httpClient.post.mockResolvedValue({ Error: 0 })
      // Chain accepts the final transaction
      mocks.signingService.sendTx.mockResolvedValue({ Error: 0, Result: '' })

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        currentSigner: {
          type: 'CommonWallet',
          key: 'encrypted-key',
          address: 'AQ123',
          salt: 'salt',
        },
        password: 'correct-password',
      })

      expect(mocks.signingService.sendTx).toHaveBeenCalledWith(fakeTx)
      expect(result).toMatchObject({ ok: true, sentToChain: true })
    })

    it('returns a password error when decryption fails', async () => {
      const fakeTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: [] as string[] }],
      }
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(fakeTx)
      mocks.transactionSdk.tryDecryptWallet.mockResolvedValue(null)

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        currentSigner: {
          type: 'CommonWallet',
          key: 'encrypted-key',
          address: 'AQ123',
          salt: 'salt',
        },
        password: 'wrong-password',
      })

      expect(result).toEqual({ ok: false, messageKey: 'common.pwdErr' })
      expect(mocks.httpClient.post).not.toHaveBeenCalled()
    })

    it('returns a failure when the server rejects the signature submission', async () => {
      const sigData: string[] = []
      const fakeTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }

      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(fakeTx)
      mocks.transactionSdk.tryDecryptWallet.mockResolvedValue({ key: 'private-key' })
      mocks.transactionSdk.signTransactionMultiSig.mockResolvedValue(undefined)
      mocks.serializationService.serializeTx.mockReturnValue('serialized-tx')
      // Server rejects the signature
      mocks.httpClient.post.mockResolvedValue({
        Error: 1,
        Desc: 'Signature already submitted',
        Result: null,
      })

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        currentSigner: {
          type: 'CommonWallet',
          key: 'encrypted-key',
          address: 'AQ123',
          salt: 'salt',
        },
        password: 'correct-password',
      })

      expect(result).toEqual({ ok: false, message: 'Signature already submitted' })
      expect(mocks.signingService.sendTx).not.toHaveBeenCalled()
    })
  })
})
