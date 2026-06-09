import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkPublicKeyIsInTheConnectedLedger: vi.fn(),
  legacySignWithLedger: vi.fn(),
  createSdkTxSignature: vi.fn(),
  makeDummyTransferTx: vi.fn(),
  createSdkAddress: vi.fn(),
  serializeTx: vi.fn(),
}))

vi.mock('../../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: unknown[]) =>
    mocks.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: unknown[]) => mocks.legacySignWithLedger(...args),
}))

vi.mock('../../../shared/chain/transactionSdk', () => ({
  createSdkTxSignature: (...args: unknown[]) => mocks.createSdkTxSignature(...args),
  makeDummyTransferTx: (...args: unknown[]) => mocks.makeDummyTransferTx(...args),
}))

vi.mock('../../../shared/chain/walletSdk', () => ({
  createSdkAddress: (...args: unknown[]) => mocks.createSdkAddress(...args),
}))

vi.mock('../serializationService', () => ({
  serializeTx: (...args: unknown[]) => mocks.serializeTx(...args),
}))

import {
  addLedgerSignature,
  signLedgerPayload,
  signSharedTxWithLedger,
  signWithLedger,
} from './ledgerSigning'
import { createFakeTransaction } from '../../../shared/chain/__fixtures__/fakeSdk'
import {
  createFakeLedgerWallet,
  createFakeSharedLedgerWallet,
} from '../../../shared/chain/__fixtures__/fakeLedgerTransport'

beforeEach(() => {
  vi.clearAllMocks()
  // Mirror the real signature builder so M / sigData assertions are meaningful.
  mocks.createSdkTxSignature.mockImplementation(async (M, pubKeys, sigData) => ({
    M,
    pubKeys,
    sigData,
  }))
})

describe('signWithLedger()', () => {
  it('rejects when the connected device check throws', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('Ledger cancelled'))

    await expect(
      signWithLedger(
        createFakeTransaction(),
        createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 0, neo: undefined })
      )
    ).rejects.toThrow('Ledger cancelled')
  })

  it('preserves unsigned transaction fields and replaces sigs with one signature', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-signature')

    const payer = { value: 'existing-payer' }
    const tx = createFakeTransaction({ payer })
    const gasPrice = tx.gasPrice

    const result = await signWithLedger(
      tx,
      createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 0, neo: false })
    )

    expect(result).toBe(tx)
    expect(tx.gasPrice).toBe(gasPrice)
    expect(tx.payer).toBe(payer)
    expect(tx.sigs).toHaveLength(1)
    expect(tx.sigs?.[0]).toMatchObject({ M: 1, sigData: ['01ledger-signature'] })
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith(tx.serializeUnsignedData(), false, 0)
  })

  it('normalizes nested legacy metadata and rejects invalid account indexes', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-signature')

    const wallet = createFakeLedgerWallet({
      address: '',
      publicKey: '',
      wallet: { address: 'nested-address', publicKey: 'nested-public-key', acct: 2, neo: 1 },
    } as never)

    await expect(signWithLedger(createFakeTransaction(), wallet)).resolves.toBeDefined()
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(
      2,
      true,
      'nested-public-key'
    )

    await expect(
      signWithLedger(createFakeTransaction(), createFakeLedgerWallet({ acct: -1 } as never))
    ).rejects.toThrow('Ledger account index is invalid')
  })

  it('rejects ledger transactions without public keys or gas prices', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)

    await expect(
      signWithLedger(createFakeTransaction(), createFakeLedgerWallet({ publicKey: '' }))
    ).rejects.toThrow('Ledger public key is unavailable')

    await expect(
      signWithLedger(
        createFakeTransaction({ gasPrice: undefined }),
        createFakeLedgerWallet({ publicKey: 'ledger-pk' })
      )
    ).rejects.toThrow('Transaction gas price is unavailable')
  })
})

describe('addLedgerSignature()', () => {
  it('preserves unsigned fields and appends a signature', async () => {
    const payer = { value: 'existing-payer' }
    const tx = createFakeTransaction({ payer, serializeUnsignedData: vi.fn(() => 'unsigned-data') })
    const gasPrice = tx.gasPrice
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-signature')

    const result = await addLedgerSignature({
      tx,
      wallet: { address: 'AQ1', publicKey: 'ledger-public-key', acct: 1, neo: false } as never,
    })

    expect(result).toBe(tx)
    expect(tx.gasPrice).toBe(gasPrice)
    expect(tx.payer).toBe(payer)
    expect(mocks.createSdkAddress).not.toHaveBeenCalled()
    expect(tx.sigs).toHaveLength(1)
    expect(tx.sigs?.[0]).toMatchObject({ sigData: ['01ledger-signature'] })
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith('unsigned-data', false, 1)
  })

  it('uses nested legacy metadata and initializes an absent signature list', async () => {
    const tx = createFakeTransaction({ sigs: undefined })
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('signature')

    await expect(
      addLedgerSignature({
        tx,
        wallet: {
          address: '',
          publicKey: '',
          wallet: { address: 'nested', publicKey: 'nested-public-key', neo: true, acct: 2 },
        } as never,
      })
    ).resolves.toBe(tx)
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(
      2,
      true,
      'nested-public-key'
    )
    expect(tx.sigs).toHaveLength(1)
  })

  it('rejects ledger transactions without gas prices', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)

    await expect(
      addLedgerSignature({
        tx: createFakeTransaction({ gasPrice: undefined }),
        wallet: { address: 'AQ1', publicKey: 'pk', neo: false } as never,
      })
    ).rejects.toThrow('Transaction gas price is unavailable')
  })
})

describe('signSharedTxWithLedger()', () => {
  it('seeds an M-of-N signature for the first signer and preserves unsigned fields', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('shared-ledger-signature')

    const payer = { value: 'shared-wallet-payer' }
    const tx = createFakeTransaction({ payer })
    const gasPrice = tx.gasPrice
    const wallet = createFakeSharedLedgerWallet({ publicKey: 'ledger-pk', acct: 3, neo: true })

    const result = await signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, true)

    expect(result).toBe(tx)
    expect(tx.gasPrice).toBe(gasPrice)
    expect(tx.payer).toBe(payer)
    expect(tx.sigs || []).toHaveLength(1)
    expect(tx.sigs?.[0]).toMatchObject({ M: 2, sigData: ['01shared-ledger-signature'] })
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(3, true, 'ledger-pk')
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith(tx.serializeUnsignedData(), true, 3)
  })

  it('does not append when device validation fails', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('wrong ledger'))
    const tx = createFakeTransaction()

    await expect(
      signSharedTxWithLedger(
        tx,
        2,
        ['pk-1', 'pk-2'],
        createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 1, neo: false }),
        true
      )
    ).rejects.toThrow('wrong ledger')
    expect(tx.sigs).toHaveLength(0)
    expect(mocks.legacySignWithLedger).not.toHaveBeenCalled()
  })

  it('appends subsequent signatures and rejects a missing signature payload', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('next-signature')
    const wallet = createFakeSharedLedgerWallet({ publicKey: 'ledger-pk' })
    const tx = createFakeTransaction({ sigs: [{ sigData: ['01first-signature'] }] as never })

    await expect(signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, false)).resolves.toBe(tx)
    expect(tx.sigs?.[0]?.sigData).toEqual(['01first-signature', '01next-signature'])

    await expect(
      signSharedTxWithLedger(createFakeTransaction(), 2, ['pk-1'], wallet, false)
    ).rejects.toThrow('Shared transaction signature payload is missing')
  })

  it('initializes the shared signature array when the first signature is added', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('first-signature')
    const tx = createFakeTransaction({ sigs: undefined })

    await signSharedTxWithLedger(tx, 1, ['pk-1'], createFakeSharedLedgerWallet(), true)

    expect(tx.sigs).toHaveLength(1)
  })
})

describe('signLedgerPayload()', () => {
  it('wraps raw payloads in a dummy transaction and serializes the result', async () => {
    const tx = createFakeTransaction({ serializeUnsignedData: vi.fn(() => 'unsigned-data') })
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.createSdkAddress.mockResolvedValue({ value: 'address' })
    mocks.makeDummyTransferTx.mockResolvedValue(tx)
    mocks.legacySignWithLedger.mockResolvedValue('signature')
    mocks.serializeTx.mockReturnValue('serialized-ledger-payload')

    await expect(
      signLedgerPayload({
        payload: 'aabb',
        wallet: { address: 'AQ1', publicKey: 'ledger-pk', neo: false, acct: 0 } as never,
      })
    ).resolves.toBe('serialized-ledger-payload')

    expect(tx.payload?.code).toBe('aabb')
    expect(mocks.serializeTx).toHaveBeenCalledWith(tx, 'transaction.signLedgerPayload.serialize')
  })

  it('routes transaction-object payloads through single-signature ledger signing', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('signature')
    const tx = createFakeTransaction()

    const result = await signLedgerPayload({
      payload: tx,
      wallet: { address: 'AQ1', publicKey: 'ledger-pk', neo: false, acct: 4 } as never,
    })

    expect(result).toBe(tx)
    expect(tx.sigs).toHaveLength(1)
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(4, false, 'ledger-pk')
    expect(mocks.createSdkAddress).not.toHaveBeenCalled()
  })
})
