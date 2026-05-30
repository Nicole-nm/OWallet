import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  signWithWallet: vi.fn(),
  signMessageWithWallet: vi.fn(),
  addWalletSignature: vi.fn(),
}))

vi.mock('../../transaction/signingService', () => ({
  signWithWallet: (...args: unknown[]) => mocks.signWithWallet(...args),
  signMessageWithWallet: (...args: unknown[]) => mocks.signMessageWithWallet(...args),
  signWithLedger: vi.fn(),
}))

vi.mock('../../transaction/walletSigningOrchestrator', () => ({
  addWalletSignature: (...args: unknown[]) => mocks.addWalletSignature(...args),
}))

import { createCommonWalletAdapter } from './commonAdapter'
import {
  createFakeEncryptedWallet,
  createFakeTransaction,
} from '../../../shared/chain/__fixtures__/fakeSdk'

describe('CommonWalletAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports common-wallet capabilities', () => {
    const adapter = createCommonWalletAdapter(createFakeEncryptedWallet({ label: 'A' }))
    expect(adapter.capabilities).toEqual({
      requiresPassword: true,
      requiresHardwareDevice: false,
      singleSignature: true,
      multiSignature: false,
      canSignMessage: true,
    })
  })

  it('exposes identity from the stored wallet', () => {
    const adapter = createCommonWalletAdapter(
      createFakeEncryptedWallet({ address: 'AQabc', publicKey: 'pub-1', label: 'My Wallet' })
    )
    expect(adapter.identity).toEqual({
      type: 'common',
      address: 'AQabc',
      publicKey: 'pub-1',
      label: 'My Wallet',
    })
  })

  it('signs a transaction by delegating to signWithWallet', async () => {
    const tx = createFakeTransaction()
    const signed = createFakeTransaction({ sigs: [{ M: 1, pubKeys: [], sigData: ['signed'] }] })
    mocks.signWithWallet.mockResolvedValue(signed)

    const wallet = createFakeEncryptedWallet()
    const adapter = createCommonWalletAdapter(wallet)
    const result = await adapter.signTransaction(tx, { password: 'correct' })

    expect(result).toBe(signed)
    expect(mocks.signWithWallet).toHaveBeenCalledWith(tx, wallet, 'correct')
  })

  it('returns null when signWithWallet returns undefined (wrong password)', async () => {
    mocks.signWithWallet.mockResolvedValue(undefined)

    const adapter = createCommonWalletAdapter(createFakeEncryptedWallet())
    const result = await adapter.signTransaction(createFakeTransaction(), { password: 'wrong' })

    expect(result).toBeNull()
  })

  it('signs a message by delegating to signMessageWithWallet', async () => {
    mocks.signMessageWithWallet.mockResolvedValue({ serializeHex: () => 'msg-sig-hex' })

    const wallet = createFakeEncryptedWallet()
    const adapter = createCommonWalletAdapter(wallet)
    const result = await adapter.signMessage('hello', { password: 'correct' })

    expect(result).toBe('msg-sig-hex')
    expect(mocks.signMessageWithWallet).toHaveBeenCalledWith('hello', wallet, 'correct')
  })

  it('returns null from signMessage when decryption fails', async () => {
    mocks.signMessageWithWallet.mockResolvedValue(undefined)

    const adapter = createCommonWalletAdapter(createFakeEncryptedWallet())
    const result = await adapter.signMessage('hello', { password: 'wrong' })

    expect(result).toBeNull()
  })

  it('appends a co-signer signature via addWalletSignature', async () => {
    const tx = createFakeTransaction({ sigs: [{ M: 1, pubKeys: [], sigData: ['existing'] }] })
    const updated = createFakeTransaction({
      sigs: [{ M: 1, pubKeys: [], sigData: ['existing', 'new'] }],
    })
    mocks.addWalletSignature.mockResolvedValue(updated)

    const wallet = createFakeEncryptedWallet()
    const adapter = createCommonWalletAdapter(wallet)
    const result = await adapter.addSignature(tx, { password: 'correct' })

    expect(result).toBe(updated)
    expect(mocks.addWalletSignature).toHaveBeenCalledWith({
      tx,
      wallet,
      password: 'correct',
    })
  })

  it('returns null from addSignature when addWalletSignature returns null', async () => {
    mocks.addWalletSignature.mockResolvedValue(null)

    const adapter = createCommonWalletAdapter(createFakeEncryptedWallet())
    const result = await adapter.addSignature(createFakeTransaction(), { password: 'wrong' })

    expect(result).toBeNull()
  })
})
