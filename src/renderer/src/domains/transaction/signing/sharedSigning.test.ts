import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  tryDecryptWallet: vi.fn(),
  signTransactionMultiSig: vi.fn(),
}))

vi.mock('../../../shared/chain/transactionSdk', () => ({
  tryDecryptWallet: (...args: unknown[]) => mocks.tryDecryptWallet(...args),
  signTransactionMultiSig: (...args: unknown[]) => mocks.signTransactionMultiSig(...args),
}))

import { signSharedTx } from './sharedSigning'
import {
  createFakeEncryptedWallet,
  createFakePrivateKey,
  createFakeTransaction,
} from '../../../shared/chain/__fixtures__/fakeSdk'

describe('signSharedTx()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined when shared-wallet decryption fails', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(null)

    await expect(
      signSharedTx(createFakeTransaction(), 2, ['pk-1'], createFakeEncryptedWallet(), 'bad')
    ).resolves.toBeUndefined()
    expect(mocks.signTransactionMultiSig).not.toHaveBeenCalled()
  })

  it('delegates shared-wallet signatures to the multi-sig SDK helper', async () => {
    const privateKey = createFakePrivateKey()
    const tx = createFakeTransaction()
    mocks.tryDecryptWallet.mockResolvedValue(privateKey)

    await expect(
      signSharedTx(tx, 2, ['pk-1', 'pk-2'], createFakeEncryptedWallet(), 'password')
    ).resolves.toBe(tx)
    expect(mocks.signTransactionMultiSig).toHaveBeenCalledWith(tx, 2, ['pk-1', 'pk-2'], privateKey)
  })
})
