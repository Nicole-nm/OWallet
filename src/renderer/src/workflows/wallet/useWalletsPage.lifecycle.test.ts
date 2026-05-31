import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommonWallet, HardwareWallet, SharedWallet } from '../../shared/lib/types'

interface MockWalletsStore {
  activeTab: string
  normalWallets: CommonWallet[]
  sharedWallets: SharedWallet[]
  hardwareWallets: HardwareWallet[]
  hasLoadedWallets: boolean
  setActiveTab(tab: string): void
}

const mocks = vi.hoisted(() => ({
  walletsStore: null as unknown as MockWalletsStore,
  hasConfiguredSavePathPreference: vi.fn(),
  loadWalletCollectionsIntoStore: vi.fn(),
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return { ...actual, onMounted: (cb: () => void) => cb() }
})

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../modules/settings/application/settingsPreferencesApplicationService', () => ({
  hasConfiguredSavePathPreference: (...args: unknown[]) =>
    mocks.hasConfiguredSavePathPreference(...args),
}))

vi.mock('../support/walletCollectionsStoreSync', () => ({
  loadWalletCollectionsIntoStore: (...args: unknown[]) =>
    mocks.loadWalletCollectionsIntoStore(...args),
}))

import { useWalletsPage } from './useWalletsPage'

function flushMicrotasks() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  mocks.loadWalletCollectionsIntoStore.mockResolvedValue({ ok: true, collections: {} })

  mocks.walletsStore = reactive<MockWalletsStore>({
    activeTab: '1',
    normalWallets: [{ address: 'AN5fHotAddr', label: 'Hot Wallet' } as CommonWallet],
    sharedWallets: [],
    hardwareWallets: [],
    hasLoadedWallets: false,
    setActiveTab(this: MockWalletsStore, tab: string) {
      this.activeTab = tab
    },
  })
})

describe('useWalletsPage onMounted', () => {
  it('opens the save-path modal when no path is configured', async () => {
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(false)
    const page = useWalletsPage()

    await flushMicrotasks()

    expect(page.showPathModal.value).toBe(true)
  })

  it('leaves the save-path modal closed when a path is configured', async () => {
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(true)
    const page = useWalletsPage()

    await flushMicrotasks()

    expect(page.showPathModal.value).toBe(false)
  })

  it('issues a non-forced wallet reload on mount', async () => {
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(true)
    useWalletsPage()

    await flushMicrotasks()

    expect(mocks.loadWalletCollectionsIntoStore).toHaveBeenCalledWith(expect.anything(), {
      force: false,
    })
  })
})

describe('useWalletsPage activeTab watch', () => {
  beforeEach(() => {
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(true)
  })

  it('clears filterQuery when the active tab changes', async () => {
    const page = useWalletsPage()
    page.filterQuery.value = 'cold'
    expect(page.filterQuery.value).toBe('cold')

    page.activeTab.value = '2'
    await nextTick()

    expect(page.filterQuery.value).toBe('')
    expect(mocks.walletsStore.activeTab).toBe('2')
  })

  it('preserves filterQuery when activeTab is reasserted to the same value', async () => {
    const page = useWalletsPage()
    page.filterQuery.value = 'cold'

    page.activeTab.value = '1'
    await nextTick()

    expect(page.filterQuery.value).toBe('cold')
  })
})
