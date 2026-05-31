import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionSdk: {
    makeDummyTransferTx: vi.fn(),
    createSdkPublicKey: vi.fn(),
    createSdkTxSignature: vi.fn(),
    addTransactionSign: vi.fn(),
    tryDecryptWallet: vi.fn(),
  },
  walletSdk: {
    createSdkAddress: vi.fn(),
  },
  ledgerSigner: {
    checkPublicKeyIsInTheConnectedLedger: vi.fn(),
    legacySignWithLedger: vi.fn(),
  },
  signingService: {
    signWithLedger: vi.fn(),
  },
  serializeTx: vi.fn(),
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  makeDummyTransferTx: (...args: any[]) => mocks.transactionSdk.makeDummyTransferTx(...args),
  createSdkPublicKey: (...args: any[]) => mocks.transactionSdk.createSdkPublicKey(...args),
  createSdkTxSignature: (...args: any[]) => mocks.transactionSdk.createSdkTxSignature(...args),
  addTransactionSign: (...args: any[]) => mocks.transactionSdk.addTransactionSign(...args),
  tryDecryptWallet: (...args: any[]) => mocks.transactionSdk.tryDecryptWallet(...args),
}))

vi.mock('../../shared/chain/walletSdk', () => ({
  createSdkAddress: (...args: any[]) => mocks.walletSdk.createSdkAddress(...args),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: any[]) =>
    mocks.ledgerSigner.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: any[]) => mocks.ledgerSigner.legacySignWithLedger(...args),
}))

vi.mock('../../shared/lib/constants', () => ({
  LEDGER_GAS_PRICE: '2500',
}))

vi.mock('./signingService', () => ({
  signWithLedger: (...args: unknown[]) => mocks.signingService.signWithLedger(...args),
}))

vi.mock('./serializationService', () => ({
  serializeTx: (...args: unknown[]) => mocks.serializeTx(...args),
}))

import {
  addLedgerSignature,
  addWalletSignature,
  signLedgerPayload,
} from './walletSigningOrchestrator'
import type { SdkTransactionLike } from '../../shared/chain/types'
import type { HardwareWalletSigner } from '../../shared/lib/types'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'

const makeTx = (): SdkTransactionLike =>
  createFakeTransaction({ serializeUnsignedData: vi.fn(() => 'unsigned-data') })

describe('walletSigningOrchestrator.addLedgerSignature()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies the ledger gas price override before appending a signature', async () => {
    const tx = makeTx()
    const wallet: HardwareWalletSigner & Record<string, any> = {
      address: 'AQ1234567890',
      publicKey: 'ledger-public-key',
      acct: 1,
      neo: false,
    }

    const payer = { value: 'sdk-address' }
    const sdkPublicKey = { value: 'sdk-pk' }
    const sdkTxSignature = { M: 1, sigData: ['01ledger-signature'] }

    mocks.ledgerSigner.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.walletSdk.createSdkAddress.mockResolvedValue(payer)
    mocks.ledgerSigner.legacySignWithLedger.mockResolvedValue('ledger-signature')
    mocks.transactionSdk.createSdkPublicKey.mockResolvedValue(sdkPublicKey)
    mocks.transactionSdk.createSdkTxSignature.mockResolvedValue(sdkTxSignature)

    const result = await addLedgerSignature({
      tx,
      wallet,
    })

    expect(result).toBe(tx)
    expect((tx.gasPrice as unknown as { val: string }).val).toBe('2500')
    expect(tx.payer).toBe(payer)
    expect(tx.sigs).toEqual([sdkTxSignature])
    expect(mocks.ledgerSigner.legacySignWithLedger).toHaveBeenCalledWith('unsigned-data', false, 1)
  })

  it('uses nested legacy metadata and initializes an absent signature list', async () => {
    const tx = makeTx()
    tx.sigs = undefined
    const wallet: HardwareWalletSigner & Record<string, any> = {
      address: '',
      publicKey: '',
      wallet: {
        address: 'nested-address',
        publicKey: 'nested-public-key',
        neo: true,
        acct: 2,
      },
    }
    mocks.walletSdk.createSdkAddress.mockResolvedValue({ value: 'payer' })
    mocks.ledgerSigner.legacySignWithLedger.mockResolvedValue('signature')
    mocks.transactionSdk.createSdkPublicKey.mockResolvedValue({ value: 'pk' })
    mocks.transactionSdk.createSdkTxSignature.mockResolvedValue({ sigData: ['01signature'] })

    await expect(addLedgerSignature({ tx, wallet })).resolves.toBe(tx)
    expect(mocks.ledgerSigner.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(
      2,
      true,
      'nested-public-key'
    )
    expect(tx.sigs).toHaveLength(1)
  })

  it('rejects ledger transactions without gas prices', async () => {
    const tx = makeTx()
    tx.gasPrice = undefined

    await expect(
      addLedgerSignature({
        tx,
        wallet: {
          address: 'AQ123',
          publicKey: 'pk',
          neo: false,
        } as never,
      })
    ).rejects.toThrow('Transaction gas price is unavailable')
  })
})

describe('walletSigningOrchestrator.addWalletSignature()', () => {
  it('returns null after failed decryption and appends valid signatures', async () => {
    const tx = makeTx()
    const wallet = {
      address: 'AQ123',
      key: 'encrypted',
      salt: 'salt',
    } as never

    mocks.transactionSdk.tryDecryptWallet.mockResolvedValueOnce(null)
    await expect(addWalletSignature({ tx, wallet, password: 'bad' })).resolves.toBeNull()

    const privateKey = { value: 'private-key' }
    mocks.transactionSdk.tryDecryptWallet.mockResolvedValueOnce(privateKey)
    await expect(addWalletSignature({ tx, wallet, password: 'good' })).resolves.toBe(tx)
    expect(mocks.transactionSdk.addTransactionSign).toHaveBeenCalledWith(tx, privateKey)
  })
})

describe('walletSigningOrchestrator.signLedgerPayload()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wraps raw payloads in dummy transactions and serializes the signature', async () => {
    const tx = makeTx()
    mocks.walletSdk.createSdkAddress.mockResolvedValue({ value: 'address' })
    mocks.transactionSdk.makeDummyTransferTx.mockResolvedValue(tx)
    mocks.ledgerSigner.legacySignWithLedger.mockResolvedValue('signature')
    mocks.transactionSdk.createSdkPublicKey.mockResolvedValue({ value: 'pk' })
    mocks.transactionSdk.createSdkTxSignature.mockResolvedValue({ sigData: ['01signature'] })
    mocks.serializeTx.mockReturnValue('serialized-ledger-payload')

    await expect(
      signLedgerPayload({
        payload: 'aabb',
        wallet: {
          address: 'AQ123',
          publicKey: 'ledger-pk',
          neo: false,
          acct: 0,
        } as never,
      })
    ).resolves.toBe('serialized-ledger-payload')

    expect(tx.payload?.code).toBe('aabb')
    expect(mocks.serializeTx).toHaveBeenCalledWith(tx, 'transaction.signLedgerPayload.serialize')
  })

  it('delegates transaction payloads to the ledger signing service', async () => {
    const tx = makeTx()
    mocks.signingService.signWithLedger.mockResolvedValue(tx)

    await expect(
      signLedgerPayload({
        payload: tx,
        wallet: {
          address: 'AQ123',
          publicKey: 'ledger-pk',
          neo: false,
          acct: 4,
        } as never,
      })
    ).resolves.toBe(tx)
    expect(mocks.signingService.signWithLedger).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ publicKey: 'ledger-pk' })
    )
  })
})
