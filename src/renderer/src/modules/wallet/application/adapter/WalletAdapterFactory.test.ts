import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  signWithWallet: vi.fn(),
  signMessageWithWallet: vi.fn(),
  signWithLedger: vi.fn(),
  signSharedTx: vi.fn(),
  signSharedTxWithLedger: vi.fn(),
  addWalletSignature: vi.fn(),
  addLedgerSignature: vi.fn(),
  signLedgerPayload: vi.fn(),
}))

vi.mock('../../../../domains/transaction/signing/walletSigning', () => ({
  signWithWallet: (...args: unknown[]) => mocks.signWithWallet(...args),
  signMessageWithWallet: (...args: unknown[]) => mocks.signMessageWithWallet(...args),
  addWalletSignature: (...args: unknown[]) => mocks.addWalletSignature(...args),
}))

vi.mock('../../../../domains/transaction/signing/ledgerSigning', () => ({
  signWithLedger: (...args: unknown[]) => mocks.signWithLedger(...args),
  addLedgerSignature: (...args: unknown[]) => mocks.addLedgerSignature(...args),
  signLedgerPayload: (...args: unknown[]) => mocks.signLedgerPayload(...args),
}))

vi.mock('../../../../domains/transaction/signing/sharedSigning', () => ({
  signSharedTx: (...args: unknown[]) => mocks.signSharedTx(...args),
  signSharedTxWithLedger: (...args: unknown[]) => mocks.signSharedTxWithLedger(...args),
}))

import { WalletAdapterFactory } from './WalletAdapterFactory'
import { createFakeEncryptedWallet } from '../../../../shared/chain/__fixtures__/fakeSdk'
import { createFakeLedgerWallet } from '../../../../shared/chain/__fixtures__/fakeLedgerTransport'

describe('WalletAdapterFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a CommonWalletAdapter for a common wallet input', () => {
    const wallet = createFakeEncryptedWallet({ address: 'AQ1', label: 'Cold' })
    const adapter = WalletAdapterFactory.create({ kind: 'common', wallet })

    expect(adapter.identity.type).toBe('common')
    expect(adapter.identity.address).toBe('AQ1')
    expect(adapter.identity.label).toBe('Cold')
    expect(adapter.capabilities.requiresPassword).toBe(true)
  })

  it('builds a LedgerWalletAdapter for a ledger wallet input', () => {
    const wallet = createFakeLedgerWallet({ address: 'ALedger', label: 'My Ledger' })
    const adapter = WalletAdapterFactory.create({ kind: 'ledger', wallet })

    expect(adapter.identity.type).toBe('ledger')
    expect(adapter.identity.address).toBe('ALedger')
    expect(adapter.capabilities.requiresHardwareDevice).toBe(true)
  })

  it('builds a SharedWalletAdapter for a shared wallet input with a common cosigner', () => {
    const adapter = WalletAdapterFactory.create({
      kind: 'shared',
      identity: { type: 'shared', address: 'TShared', publicKey: '', label: 'Vault' },
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'common', wallet: createFakeEncryptedWallet() },
    })

    expect(adapter.identity.type).toBe('shared')
    expect(adapter.identity.label).toBe('Vault')
    expect(adapter.capabilities.multiSignature).toBe(true)
    expect(adapter.capabilities.requiresPassword).toBe(true)
  })

  it('builds a SharedWalletAdapter for a shared wallet input with a ledger cosigner', () => {
    const adapter = WalletAdapterFactory.create({
      kind: 'shared',
      identity: { type: 'shared', address: 'TShared', publicKey: '', label: 'Vault' },
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'ledger', wallet: createFakeLedgerWallet() },
    })

    expect(adapter.capabilities.multiSignature).toBe(true)
    expect(adapter.capabilities.requiresHardwareDevice).toBe(true)
  })

  it('throws when the input kind is unrecognized', () => {
    // @ts-expect-error testing runtime guard
    expect(() => WalletAdapterFactory.create({ kind: 'bogus' })).toThrow(
      /unrecognized wallet input/i
    )
  })

  describe('fromWalletSigner', () => {
    it('builds a common adapter from a CommonWallet-shaped signer', () => {
      const wallet = createFakeEncryptedWallet({ address: 'AQc' })
      const adapter = WalletAdapterFactory.fromWalletSigner(wallet)
      expect(adapter?.identity.type).toBe('common')
      expect(adapter?.identity.address).toBe('AQc')
    })

    it('builds a ledger adapter from a HardwareWalletSigner with a publicKey', () => {
      const wallet = createFakeLedgerWallet({ address: 'ALedger', label: 'L' })
      const adapter = WalletAdapterFactory.fromWalletSigner(wallet)
      expect(adapter?.identity.type).toBe('ledger')
      expect(adapter?.identity.address).toBe('ALedger')
    })

    it('returns null when the signer is null', () => {
      expect(WalletAdapterFactory.fromWalletSigner(null)).toBeNull()
    })

    it('returns null for a ledger-shaped signer with no publicKey', () => {
      const adapter = WalletAdapterFactory.fromWalletSigner({ address: 'AL' })
      expect(adapter).toBeNull()
    })
  })
})
