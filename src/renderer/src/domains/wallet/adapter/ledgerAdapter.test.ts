import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  signWithLedger: vi.fn(),
  addLedgerSignature: vi.fn(),
  signLedgerPayload: vi.fn(),
}))

vi.mock('../../transaction/signingService', () => ({
  signWithLedger: (...args: unknown[]) => mocks.signWithLedger(...args),
  signWithWallet: vi.fn(),
  signMessageWithWallet: vi.fn(),
}))

vi.mock('../../transaction/walletSigningOrchestrator', () => ({
  addLedgerSignature: (...args: unknown[]) => mocks.addLedgerSignature(...args),
  signLedgerPayload: (...args: unknown[]) => mocks.signLedgerPayload(...args),
}))

import { createLedgerWalletAdapter } from './ledgerAdapter'
import { createFakeTransaction } from '../../../shared/chain/__fixtures__/fakeSdk'
import { createFakeLedgerWallet } from '../../../shared/chain/__fixtures__/fakeLedgerTransport'

describe('LedgerWalletAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports ledger-wallet capabilities', () => {
    const adapter = createLedgerWalletAdapter(createFakeLedgerWallet({ label: 'L' }))
    expect(adapter.capabilities).toEqual({
      requiresPassword: false,
      requiresHardwareDevice: true,
      singleSignature: true,
      multiSignature: false,
      canSignMessage: true,
    })
  })

  it('exposes identity from the stored hardware wallet', () => {
    const adapter = createLedgerWalletAdapter(
      createFakeLedgerWallet({
        address: 'ALedgerAddr',
        publicKey: 'ledger-pk',
        label: 'My Ledger',
      })
    )
    expect(adapter.identity).toEqual({
      type: 'ledger',
      address: 'ALedgerAddr',
      publicKey: 'ledger-pk',
      label: 'My Ledger',
    })
  })

  it('signs a transaction by delegating to signWithLedger', async () => {
    const tx = createFakeTransaction()
    const signed = createFakeTransaction({ sigs: [{ M: 1, pubKeys: [], sigData: ['ledger-sig'] }] })
    mocks.signWithLedger.mockResolvedValue(signed)

    const wallet = createFakeLedgerWallet()
    const adapter = createLedgerWalletAdapter(wallet)
    const result = await adapter.signTransaction(tx, {})

    expect(result).toBe(signed)
    expect(mocks.signWithLedger).toHaveBeenCalledWith(tx, wallet)
  })

  it('propagates errors from the underlying signWithLedger (e.g. wrong device)', async () => {
    mocks.signWithLedger.mockRejectedValue(new Error('Ledger cancelled'))

    const adapter = createLedgerWalletAdapter(createFakeLedgerWallet())
    await expect(adapter.signTransaction(createFakeTransaction(), {})).rejects.toThrow(
      'Ledger cancelled'
    )
  })

  it('appends a co-signer signature via addLedgerSignature', async () => {
    const tx = createFakeTransaction()
    const updated = createFakeTransaction({
      sigs: [{ M: 1, pubKeys: [], sigData: ['existing', 'new'] }],
    })
    mocks.addLedgerSignature.mockResolvedValue(updated)

    const wallet = createFakeLedgerWallet()
    const adapter = createLedgerWalletAdapter(wallet)
    const result = await adapter.addSignature(tx, {})

    expect(result).toBe(updated)
    expect(mocks.addLedgerSignature).toHaveBeenCalledWith({ tx, wallet })
  })

  it('signs a message string by delegating to signLedgerPayload', async () => {
    mocks.signLedgerPayload.mockResolvedValue('serialized-tx-hex')

    const wallet = createFakeLedgerWallet({ publicKey: 'pk-x' })
    const adapter = createLedgerWalletAdapter(wallet)
    const result = await adapter.signMessage('hello', {})

    expect(result).toBe('serialized-tx-hex')
    expect(mocks.signLedgerPayload).toHaveBeenCalledWith({
      payload: 'hello',
      wallet,
    })
  })

  it('returns null when signLedgerPayload returns a non-string (transaction object)', async () => {
    mocks.signLedgerPayload.mockResolvedValue(createFakeTransaction())

    const adapter = createLedgerWalletAdapter(createFakeLedgerWallet())
    const result = await adapter.signMessage('hello', {})

    expect(result).toBeNull()
  })
})
