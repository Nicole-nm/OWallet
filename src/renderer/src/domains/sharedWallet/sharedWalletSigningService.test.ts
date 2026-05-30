import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  transactionSdk: {
    deserializeTransaction: vi.fn(),
  },
  signingService: {
    sendTx: vi.fn(),
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
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: vi.fn((value) => value),
}))

vi.mock('../transaction/signingService', () => ({
  sendTx: (...args: any[]) => mocks.signingService.sendTx(...args),
}))

vi.mock('../transaction/serializationService', () => ({
  serializeTx: (...args: any[]) => mocks.serializationService.serializeTx(...args),
}))

import {
  countSerializedSharedTransactionSignatures,
  sendSerializedSharedTransaction,
  signSerializedSharedTransaction,
  signSharedTransactionDraft,
  submitPendingSharedSignature,
} from './sharedWalletSigningService'
import type { WalletAdapter, WalletCapabilities } from '../wallet/adapter'

const commonCapabilities: WalletCapabilities = {
  requiresPassword: true,
  requiresHardwareDevice: false,
  singleSignature: false,
  multiSignature: true,
  canSignMessage: false,
}

const ledgerCapabilities: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
  singleSignature: false,
  multiSignature: true,
  canSignMessage: false,
}

function makeAdapter(
  capabilities: WalletCapabilities,
  signedTx: unknown | null,
  address = 'AQ123'
): WalletAdapter {
  return {
    identity: {
      type: 'shared',
      address,
      publicKey: '',
      label: 'Multi',
    },
    capabilities,
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    addSignature: vi.fn().mockResolvedValue(signedTx),
  } as WalletAdapter
}

describe('sharedWalletSigningService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitPendingSharedSignature', () => {
    it('collects a partial signature and does not submit to chain when threshold is not met', async () => {
      const signedTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: ['existing-sig', 'new-sig'] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }
      // Wait — for "threshold not met" the test wants 1 sig out of M=2.
      const partialTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: ['existing-sig'] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }
      const deserialized = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: [] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }

      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(deserialized)
      mocks.serializationService.serializeTx.mockReturnValue('serialized-tx')
      mocks.httpClient.post.mockResolvedValue({ Error: 0 })

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        adapter: makeAdapter(commonCapabilities, partialTx),
        password: 'correct-password',
      })

      expect(result).toEqual({ ok: true, sentToChain: false })
      expect(mocks.signingService.sendTx).not.toHaveBeenCalled()
      // Reference to signedTx so TS doesn't complain about unused var
      void signedTx
    })

    it('auto-submits to chain when signature threshold is reached', async () => {
      const completedTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: ['first-sig', 'second-sig'] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'final-tx-hash'),
      }
      const deserialized = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: ['first-sig'] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'final-tx-hash'),
      }

      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(deserialized)
      mocks.serializationService.serializeTx.mockReturnValue('serialized-tx')
      mocks.httpClient.post.mockResolvedValue({ Error: 0 })
      mocks.signingService.sendTx.mockResolvedValue({ Error: 0, Result: '' })

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        adapter: makeAdapter(commonCapabilities, completedTx),
        password: 'correct-password',
      })

      expect(mocks.signingService.sendTx).toHaveBeenCalledWith(completedTx)
      expect(result).toMatchObject({ ok: true, sentToChain: true })
    })

    it('returns a password error when adapter signing returns null for a common cosigner', async () => {
      const deserialized = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: [] as string[] }],
      }
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(deserialized)

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        adapter: makeAdapter(commonCapabilities, null),
        password: 'wrong-password',
      })

      expect(result).toEqual({ ok: false, errorKey: 'common.pwdErr' })
      expect(mocks.httpClient.post).not.toHaveBeenCalled()
    })

    it('returns a ledger failure when adapter signing returns null for a ledger cosigner', async () => {
      const deserialized = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: [] as string[] }],
      }
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(deserialized)

      const result = await submitPendingSharedSignature({
        network: 'testnet',
        pendingTx: {
          transactionbodyhash: 'serialized',
          transactionidhash: 'tx-id-hash',
        },
        adapter: makeAdapter(ledgerCapabilities, null),
      })

      expect(result).toEqual({ ok: false, errorKey: 'ledgerWallet.signFailed' })
      expect(mocks.httpClient.post).not.toHaveBeenCalled()
    })

    it('returns a failure when the server rejects the signature submission', async () => {
      const signedTx = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: ['only-sig'] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }
      const deserialized = {
        sigs: [{ M: 2, pubKeys: ['pk-1', 'pk-2'], sigData: [] as string[] }],
        serializeUnsignedData: vi.fn(() => 'unsigned-data'),
        getHash: vi.fn(() => 'tx-hash'),
      }

      mocks.transactionSdk.deserializeTransaction.mockResolvedValue(deserialized)
      mocks.serializationService.serializeTx.mockReturnValue('serialized-tx')
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
        adapter: makeAdapter(commonCapabilities, signedTx),
        password: 'correct-password',
      })

      expect(result).toEqual({ ok: false, message: 'Signature already submitted' })
      expect(mocks.signingService.sendTx).not.toHaveBeenCalled()
    })
  })

  describe('signSharedTransactionDraft', () => {
    it('uses signTransaction for the first signer', async () => {
      const adapter = makeAdapter(commonCapabilities, { signed: 'first' })
      adapter.signTransaction = vi.fn().mockResolvedValue({ signed: 'first' })
      const signed = await signSharedTransactionDraft({
        tx: {},
        adapter,
        password: 'p',
        isFirstSign: true,
      })
      expect(adapter.signTransaction).toHaveBeenCalled()
      expect(signed).toEqual({ signed: 'first' })
    })

    it('uses addSignature for cosigners and returns null when signing is cancelled', async () => {
      const adapter = makeAdapter(commonCapabilities, null)
      const signed = await signSharedTransactionDraft({
        tx: {},
        adapter,
        isFirstSign: false,
      })
      expect(adapter.addSignature).toHaveBeenCalled()
      expect(signed).toBeNull()
    })
  })

  describe('signSerializedSharedTransaction', () => {
    it('returns a serialized tx on success', async () => {
      const adapter = makeAdapter(commonCapabilities, { sig: 'ok' })
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({})
      mocks.serializationService.serializeTx.mockReturnValue('serialized-signed')

      const result = await signSerializedSharedTransaction({
        serializedTx: 'hex',
        adapter,
        password: 'p',
      })

      expect(result).toEqual({ ok: true, serializedTx: 'serialized-signed' })
    })

    it('returns a password error when password is required and signing fails', async () => {
      const adapter = makeAdapter(commonCapabilities, null)
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({})

      const result = await signSerializedSharedTransaction({
        serializedTx: 'hex',
        adapter,
      })
      expect(result).toEqual({ ok: false, errorKey: 'common.pwdErr' })
    })

    it('returns cancelled when no password is required and signing fails', async () => {
      const adapter = makeAdapter(ledgerCapabilities, null)
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({})

      const result = await signSerializedSharedTransaction({
        serializedTx: 'hex',
        adapter,
      })
      expect(result).toEqual({ ok: false, cancelled: true })
    })
  })

  describe('sendSerializedSharedTransaction', () => {
    it('returns ok with a reversed tx hash when the chain accepts the tx', async () => {
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({
        getHash: () => 'abcd',
      })
      mocks.signingService.sendTx.mockResolvedValue({ Error: 0, Result: '' })

      const result = await sendSerializedSharedTransaction('hex')
      expect(result).toEqual({ ok: true, txHash: 'abcd', response: { Error: 0, Result: '' } })
    })

    it('maps an insufficient-balance result to a localized error key', async () => {
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({ getHash: () => 'h' })
      mocks.signingService.sendTx.mockResolvedValue({ Error: 1, Result: 'balance insufficient' })

      const result = await sendSerializedSharedTransaction('hex')
      expect(result).toMatchObject({ ok: false, errorKey: 'common.balanceInsufficient' })
    })

    it('maps a gas-cost result to the ong-not-enough error key', async () => {
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({ getHash: () => 'h' })
      mocks.signingService.sendTx.mockResolvedValue({ Error: -1, Result: 'cannot cover gas cost' })

      const result = await sendSerializedSharedTransaction('hex')
      expect(result).toMatchObject({ ok: false, errorKey: 'common.ongNoEnough' })
    })

    it('returns a generic failure message for other errors', async () => {
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({ getHash: () => 'h' })
      mocks.signingService.sendTx.mockResolvedValue({ Error: 99, Result: 'some other error' })

      const result = await sendSerializedSharedTransaction('hex')
      expect(result).toMatchObject({ ok: false, message: 'some other error' })
    })

    it('returns a network error when deserialization or send throws', async () => {
      mocks.transactionSdk.deserializeTransaction.mockRejectedValue(new Error('boom'))
      const result = await sendSerializedSharedTransaction('hex')
      expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
    })
  })

  describe('countSerializedSharedTransactionSignatures', () => {
    it('returns the number of collected signatures', async () => {
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({
        sigs: [{ sigData: ['a', 'b'] }],
      })
      expect(await countSerializedSharedTransactionSignatures('hex')).toBe(2)
    })

    it('returns 0 when no signatures are present', async () => {
      mocks.transactionSdk.deserializeTransaction.mockResolvedValue({ sigs: [undefined] })
      expect(await countSerializedSharedTransactionSignatures('hex')).toBe(0)
    })
  })
})
