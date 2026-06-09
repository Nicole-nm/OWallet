import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  tryDecryptWallet: vi.fn(),
  createSdkTxSignature: vi.fn(),
  addTransactionSign: vi.fn(),
}))

vi.mock('../../../shared/chain/transactionSdk', () => ({
  tryDecryptWallet: (...args: unknown[]) => mocks.tryDecryptWallet(...args),
  createSdkTxSignature: (...args: unknown[]) => mocks.createSdkTxSignature(...args),
  addTransactionSign: (...args: unknown[]) => mocks.addTransactionSign(...args),
}))

import { signWithWallet, addWalletSignature, signMessageWithWallet } from './walletSigning'
import {
  createFakeEncryptedWallet,
  createFakePrivateKey,
  createFakeTransaction,
} from '../../../shared/chain/__fixtures__/fakeSdk'

describe('signWithWallet()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createSdkTxSignature.mockResolvedValue({ M: 1 })
  })

  it('returns the signed transaction on the success path', async () => {
    const tx = createFakeTransaction()
    const wallet = createFakeEncryptedWallet()
    mocks.tryDecryptWallet.mockResolvedValue(createFakePrivateKey())

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
    mocks.tryDecryptWallet.mockResolvedValue(null)

    const result = await signWithWallet(tx, createFakeEncryptedWallet(), 'wrong-password')

    expect(result).toBeUndefined()
    expect(tx.sigs).toHaveLength(0)
  })

  it('throws when the private key produces an empty signature hex', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(createFakePrivateKey({ signatureHex: '' }))

    await expect(
      signWithWallet(createFakeTransaction(), createFakeEncryptedWallet(), 'correct-password')
    ).rejects.toThrow('Transaction signature is empty')
  })

  it('throws when neither wallet nor private key exposes a public key', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(createFakePrivateKey({ publicKeyHex: '' }))

    await expect(
      signWithWallet(
        createFakeTransaction(),
        createFakeEncryptedWallet({ publicKey: '' }),
        'correct-password'
      )
    ).rejects.toThrow('Wallet public key is unavailable')
  })
})

describe('addWalletSignature()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null after failed decryption and appends valid signatures', async () => {
    const tx = createFakeTransaction()
    const wallet = { address: 'AQ123', key: 'encrypted', salt: 'salt' } as never

    mocks.tryDecryptWallet.mockResolvedValueOnce(null)
    await expect(addWalletSignature({ tx, wallet, password: 'bad' })).resolves.toBeNull()

    const privateKey = { value: 'private-key' }
    mocks.tryDecryptWallet.mockResolvedValueOnce(privateKey)
    await expect(addWalletSignature({ tx, wallet, password: 'good' })).resolves.toBe(tx)
    expect(mocks.addTransactionSign).toHaveBeenCalledWith(tx, privateKey)
  })
})

describe('signMessageWithWallet()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a signature object for valid credentials', async () => {
    const fakeSignResult = { serializeHex: () => 'message-sig-hex' }
    const fakePrivateKey = createFakePrivateKey()
    fakePrivateKey.sign.mockReturnValue(fakeSignResult)
    mocks.tryDecryptWallet.mockResolvedValue(fakePrivateKey)

    const result = await signMessageWithWallet(
      'hello world',
      createFakeEncryptedWallet(),
      'correct-password'
    )

    expect(result).toBe(fakeSignResult)
    expect(fakePrivateKey.sign).toHaveBeenCalledWith('hello world')
  })

  it('returns undefined when the password is wrong', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(null)

    const result = await signMessageWithWallet(
      'hello world',
      createFakeEncryptedWallet(),
      'bad-password'
    )

    expect(result).toBeUndefined()
  })
})
