import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  signWithWallet: vi.fn(),
  signMessageWithWallet: vi.fn(),
  signWithLedger: vi.fn(),
  signSharedTx: vi.fn(),
  signSharedTxWithLedger: vi.fn(),
  addWalletSignature: vi.fn(),
  addLedgerSignature: vi.fn(),
  signLedgerPayload: vi.fn(),
  loadCurrentWalletSession: vi.fn(() => null),
  saveCurrentWalletSession: vi.fn(),
  loadWalletsTabSession: vi.fn(() => ''),
  saveWalletsTabSession: vi.fn(),
}))

vi.mock('../../../domains/transaction/signingService', () => ({
  signWithWallet: (...args: unknown[]) => mocks.signWithWallet(...args),
  signMessageWithWallet: (...args: unknown[]) => mocks.signMessageWithWallet(...args),
  signWithLedger: (...args: unknown[]) => mocks.signWithLedger(...args),
  signSharedTx: (...args: unknown[]) => mocks.signSharedTx(...args),
  signSharedTxWithLedger: (...args: unknown[]) => mocks.signSharedTxWithLedger(...args),
}))

vi.mock('../../../domains/transaction/walletSigningOrchestrator', () => ({
  addWalletSignature: (...args: unknown[]) => mocks.addWalletSignature(...args),
  addLedgerSignature: (...args: unknown[]) => mocks.addLedgerSignature(...args),
  signLedgerPayload: (...args: unknown[]) => mocks.signLedgerPayload(...args),
}))

vi.mock('../../../shared/persistence/appStateService', () => ({
  loadCurrentWalletSession: () => mocks.loadCurrentWalletSession(),
  saveCurrentWalletSession: (...args: unknown[]) => mocks.saveCurrentWalletSession(...args),
  loadWalletsTabSession: () => mocks.loadWalletsTabSession(),
  saveWalletsTabSession: (...args: unknown[]) => mocks.saveWalletsTabSession(...args),
  loadSharedWalletSession: () => null,
  saveSharedWalletSession: vi.fn(),
}))

import { useWalletAdapter } from './useWalletAdapter'
import { useCurrentWalletStore } from '../../../stores/modules/CurrentWallet'
import { useWalletsStore } from '../../../stores/modules/Wallets'
import { createFakeEncryptedWallet } from '../../../shared/chain/__fixtures__/fakeSdk'
import type { HardwareWallet, SharedWallet } from '../../../shared/lib/types'

import { createFakeHardwareWallet } from '../../../shared/chain/__fixtures__/fakeWallet'

const makeHardwareWallet = (overrides: Partial<HardwareWallet> = {}): HardwareWallet =>
  createFakeHardwareWallet({ publicKey: 'ledger-pk', ...overrides })

function makeSharedWallet(overrides: Partial<SharedWallet> = {}): SharedWallet {
  return {
    address: 'TSharedAddr',
    label: 'Vault',
    publicKey: '',
    sharedWalletAddress: 'TSharedAddr',
    sharedWalletName: 'Vault',
    requiredNumber: '2',
    totalNumber: '3',
    coPayers: [
      { name: 'A', address: 'AQ1', publickey: 'cp-1' },
      { name: 'B', address: 'AQ2', publickey: 'cp-2' },
      { name: 'C', address: 'AQ3', publickey: 'cp-3' },
    ],
    ...overrides,
  }
}

describe('useWalletAdapter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('returns null when no current wallet is set', () => {
    const { adapter } = useWalletAdapter()
    expect(adapter.value).toBeNull()
  })

  it('returns a CommonWalletAdapter when current wallet matches normalWallets', () => {
    const stored = createFakeEncryptedWallet({ address: 'AQabc', label: 'Cold' })
    const walletsStore = useWalletsStore()
    walletsStore.normalWallets = [stored]
    const currentStore = useCurrentWalletStore()
    currentStore.wallet = {
      ...currentStore.wallet,
      address: 'AQabc',
      label: 'Cold',
      publicKey: stored.publicKey,
    }

    const { adapter } = useWalletAdapter()
    expect(adapter.value?.identity.type).toBe('common')
    expect(adapter.value?.identity.address).toBe('AQabc')
  })

  it('returns a LedgerWalletAdapter when current wallet matches hardwareWallets', () => {
    const stored = makeHardwareWallet({ address: 'ALedgerX' })
    const walletsStore = useWalletsStore()
    walletsStore.hardwareWallets = [stored]
    const currentStore = useCurrentWalletStore()
    currentStore.wallet = {
      ...currentStore.wallet,
      address: 'ALedgerX',
      label: stored.label,
      publicKey: stored.publicKey,
    }

    const { adapter } = useWalletAdapter()
    expect(adapter.value?.identity.type).toBe('ledger')
    expect(adapter.value?.identity.address).toBe('ALedgerX')
  })

  it('returns a SharedWalletAdapter when current wallet is shared and a common cosigner is selected', () => {
    const shared = makeSharedWallet()
    const cosignerWallet = createFakeEncryptedWallet({ address: 'AQ1', publicKey: 'cp-1' })

    const walletsStore = useWalletsStore()
    walletsStore.sharedWallets = [shared]
    walletsStore.normalWallets = [cosignerWallet]

    const currentStore = useCurrentWalletStore()
    currentStore.wallet = {
      ...currentStore.wallet,
      address: shared.sharedWalletAddress!,
      sharedWalletAddress: shared.sharedWalletAddress,
      label: shared.label,
      publicKey: '',
    }
    currentStore.currentSigner = {
      type: 'CommonWallet',
      address: 'AQ1',
      publicKey: 'cp-1',
    }

    const { adapter } = useWalletAdapter()
    expect(adapter.value?.identity.type).toBe('shared')
    expect(adapter.value?.capabilities.multiSignature).toBe(true)
    expect(adapter.value?.capabilities.requiresPassword).toBe(true)
  })

  it('returns null when current wallet is shared but no cosigner is found', () => {
    const shared = makeSharedWallet()
    const walletsStore = useWalletsStore()
    walletsStore.sharedWallets = [shared]

    const currentStore = useCurrentWalletStore()
    currentStore.wallet = {
      ...currentStore.wallet,
      address: shared.sharedWalletAddress!,
      sharedWalletAddress: shared.sharedWalletAddress,
      label: shared.label,
      publicKey: '',
    }
    // currentSigner left as default (empty address) — should result in null

    const { adapter } = useWalletAdapter()
    expect(adapter.value).toBeNull()
  })

  it('reactively rebuilds the adapter when the current wallet address changes', () => {
    const a = createFakeEncryptedWallet({ address: 'AQ1', label: 'A' })
    const b = createFakeEncryptedWallet({ address: 'AQ2', label: 'B' })
    const walletsStore = useWalletsStore()
    walletsStore.normalWallets = [a, b]

    const currentStore = useCurrentWalletStore()
    currentStore.wallet = {
      ...currentStore.wallet,
      address: 'AQ1',
      label: 'A',
      publicKey: a.publicKey,
    }

    const { adapter } = useWalletAdapter()
    expect(adapter.value?.identity.address).toBe('AQ1')

    currentStore.wallet = {
      ...currentStore.wallet,
      address: 'AQ2',
      label: 'B',
      publicKey: b.publicKey,
    }
    expect(adapter.value?.identity.address).toBe('AQ2')
  })
})
