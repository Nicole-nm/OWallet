import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  tryDecryptWallet: vi.fn(),
  loadOntologySdk: vi.fn(),
  checkPublicKeyIsInTheConnectedLedger: vi.fn(),
  legacySignWithLedger: vi.fn(),
  serializeTx: vi.fn(),
  getRestClient: vi.fn(),
  GAS_PRICE: '500',
  LEDGER_GAS_PRICE: '2500',
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  tryDecryptWallet: (...args: unknown[]) => mocks.tryDecryptWallet(...args),
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: () => mocks.loadOntologySdk(),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: unknown[]) =>
    mocks.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: unknown[]) => mocks.legacySignWithLedger(...args),
}))

vi.mock('./serializationService', () => ({
  serializeTx: (...args: unknown[]) => mocks.serializeTx(...args),
}))

vi.mock('../../shared/chain/restClient', () => ({
  getRestClient: () => mocks.getRestClient(),
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_PRICE: '500',
  LEDGER_GAS_PRICE: '2500',
}))

import {
  signWithWallet,
  signMessageWithWallet,
  signWithLedger,
  signSharedTx,
  signSharedTxWithLedger,
  sendTx,
  preExecTx,
} from './signingService'
import {
  createFakeEncryptedWallet,
  createFakeOntologySdk,
  createFakePrivateKey,
  createFakeTransaction,
} from '../../shared/chain/__fixtures__/fakeSdk'
import {
  createFakeLedgerWallet,
  createFakeSharedLedgerWallet,
} from '../../shared/chain/__fixtures__/fakeLedgerTransport'

// ---------------------------------------------------------------------------
// signWithWallet
// ---------------------------------------------------------------------------

describe('signWithWallet()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the signed transaction on the success path', async () => {
    const tx = createFakeTransaction()
    const wallet = createFakeEncryptedWallet()

    mocks.tryDecryptWallet.mockResolvedValue(createFakePrivateKey())
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    const result = await signWithWallet(tx, wallet, 'correct-password')

    expect(result).toBe(tx)
    expect(tx.sigs).toHaveLength(1)
    expect(mocks.tryDecryptWallet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'encrypted-key' }),
      'correct-password'
    )
  })

  it('returns undefined when password decryption fails (wrong password)', async () => {
    const tx = createFakeTransaction()
    const wallet = createFakeEncryptedWallet()

    mocks.tryDecryptWallet.mockResolvedValue(null)

    const result = await signWithWallet(tx, wallet, 'wrong-password')

    expect(result).toBeUndefined()
    expect(tx.sigs).toHaveLength(0)
  })

  it('throws when the private key produces an empty signature hex', async () => {
    const tx = createFakeTransaction()
    const wallet = createFakeEncryptedWallet()

    mocks.tryDecryptWallet.mockResolvedValue(createFakePrivateKey({ signatureHex: '' }))
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    await expect(signWithWallet(tx, wallet, 'correct-password')).rejects.toThrow(
      'Transaction signature is empty'
    )
  })

  it('throws when neither wallet nor private key exposes a public key', async () => {
    const tx = createFakeTransaction()
    const wallet = createFakeEncryptedWallet({ publicKey: '' })

    mocks.tryDecryptWallet.mockResolvedValue(createFakePrivateKey({ publicKeyHex: '' }))
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    await expect(signWithWallet(tx, wallet, 'correct-password')).rejects.toThrow(
      'Wallet public key is unavailable'
    )
  })

  it('handles ledger-cancelled path: signWithLedger rejects when ledger check throws', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('Ledger cancelled'))
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    const tx = createFakeTransaction()
    const wallet = createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 0, neo: undefined })

    await expect(signWithLedger(tx, wallet)).rejects.toThrow('Ledger cancelled')
  })

  it('preserves unsigned transaction fields for ledger-signed transactions', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-signature')
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    const payer = { value: 'existing-payer' }
    const tx = createFakeTransaction({ payer })
    const gasPrice = tx.gasPrice
    const wallet = createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 0, neo: false })

    const result = await signWithLedger(tx, wallet)

    expect(result).toBe(tx)
    expect(tx.gasPrice).toBe(gasPrice)
    expect(tx.payer).toBe(payer)
    expect(tx.sigs).toHaveLength(1)
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith(tx.serializeUnsignedData(), false, 0)
  })

  it('normalizes nested legacy ledger metadata and rejects invalid account indexes', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-signature')
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    const tx = createFakeTransaction()
    const wallet = createFakeLedgerWallet({
      address: '',
      publicKey: '',
      wallet: {
        address: 'nested-address',
        publicKey: 'nested-public-key',
        acct: 2,
        neo: 1,
      },
    } as never)

    await expect(signWithLedger(tx, wallet)).resolves.toBe(tx)
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
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

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

describe('signSharedTxWithLedger()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates the ledger and preserves unsigned fields for shared transactions', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('shared-ledger-signature')
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    const payer = { value: 'shared-wallet-payer' }
    const tx = createFakeTransaction({ payer })
    const gasPrice = tx.gasPrice
    const wallet = createFakeSharedLedgerWallet({
      publicKey: 'ledger-pk',
      acct: 3,
      neo: true,
    })

    const result = await signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, true)

    expect(result).toBe(tx)
    expect(tx.gasPrice).toBe(gasPrice)
    expect(tx.payer).toBe(payer)
    expect(tx.sigs || []).toHaveLength(1)
    expect(tx.sigs?.[0]).toMatchObject({ M: 2, sigData: ['01shared-ledger-signature'] })
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(3, true, 'ledger-pk')
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith(tx.serializeUnsignedData(), true, 3)
  })

  it('does not append a shared ledger signature when device validation fails', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('wrong ledger'))
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    const tx = createFakeTransaction()
    const wallet = createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 1, neo: false })

    await expect(signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, true)).rejects.toThrow(
      'wrong ledger'
    )
    expect(tx.sigs).toHaveLength(0)
    expect(mocks.legacySignWithLedger).not.toHaveBeenCalled()
  })

  it('appends additional shared ledger signatures and rejects missing signature payloads', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('next-signature')
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())
    const wallet = createFakeSharedLedgerWallet({ publicKey: 'ledger-pk' })
    const tx = createFakeTransaction({
      sigs: [{ sigData: ['01first-signature'] }] as never,
    })

    await expect(signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, false)).resolves.toBe(tx)
    expect(tx.sigs?.[0]?.sigData).toEqual(['01first-signature', '01next-signature'])

    await expect(
      signSharedTxWithLedger(createFakeTransaction(), 2, ['pk-1'], wallet, false)
    ).rejects.toThrow('Shared transaction signature payload is missing')
  })

  it('initializes the shared signature array when the first signature is added', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('first-signature')
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())
    const tx = createFakeTransaction({ sigs: undefined })

    await signSharedTxWithLedger(tx, 1, ['pk-1'], createFakeSharedLedgerWallet(), true)

    expect(tx.sigs).toHaveLength(1)
  })
})

describe('signSharedTx()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined when shared-wallet decryption fails', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(null)
    mocks.loadOntologySdk.mockResolvedValue(createFakeOntologySdk())

    await expect(
      signSharedTx(createFakeTransaction(), 2, ['pk-1'], createFakeEncryptedWallet(), 'bad')
    ).resolves.toBeUndefined()
  })

  it('delegates shared-wallet signatures to the SDK', async () => {
    const sdk = createFakeOntologySdk()
    const privateKey = createFakePrivateKey()
    const tx = createFakeTransaction()
    mocks.tryDecryptWallet.mockResolvedValue(privateKey)
    mocks.loadOntologySdk.mockResolvedValue(sdk)

    await expect(
      signSharedTx(tx, 2, ['pk-1', 'pk-2'], createFakeEncryptedWallet(), 'password')
    ).resolves.toBe(tx)
    expect(sdk.TransactionBuilder.signTx).toHaveBeenCalledWith(
      tx,
      2,
      expect.arrayContaining([expect.objectContaining({ hex: 'pk-1' })]),
      privateKey
    )
  })
})

// ---------------------------------------------------------------------------
// signMessageWithWallet
// ---------------------------------------------------------------------------

describe('signMessageWithWallet()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a signature object for valid credentials', async () => {
    const fakeSignResult = { serializeHex: () => 'message-sig-hex' }
    const fakePrivateKey = createFakePrivateKey()
    fakePrivateKey.sign.mockReturnValue(fakeSignResult)

    mocks.tryDecryptWallet.mockResolvedValue(fakePrivateKey)

    const wallet = createFakeEncryptedWallet()
    const result = await signMessageWithWallet('hello world', wallet, 'correct-password')

    expect(result).toBe(fakeSignResult)
    expect(fakePrivateKey.sign).toHaveBeenCalledWith('hello world')
  })

  it('returns undefined when the password is wrong', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(null)

    const wallet = createFakeEncryptedWallet()
    const result = await signMessageWithWallet('hello world', wallet, 'bad-password')

    expect(result).toBeUndefined()
  })
})

describe('transaction broadcasting', () => {
  it('serializes normal and pre-execution broadcasts', () => {
    const sendRawTransaction = vi.fn()
    const tx = createFakeTransaction()
    mocks.getRestClient.mockReturnValue({ sendRawTransaction })
    mocks.serializeTx.mockReturnValue('serialized-tx')

    sendTx(tx)
    preExecTx(tx)

    expect(sendRawTransaction).toHaveBeenNthCalledWith(1, 'serialized-tx')
    expect(sendRawTransaction).toHaveBeenNthCalledWith(2, 'serialized-tx', true)
  })
})
