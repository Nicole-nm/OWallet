import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  appUpdateStore: {
    currentVersion: 'v0.11.0',
    latestVersion: 'v0.12.0',
    releaseUrl: 'https://example.com/release',
    hasUpdate: true,
  },
  walletsStore: {
    normalWallets: [] as unknown[],
    sharedWallets: [] as unknown[],
    hardwareWallets: [] as unknown[],
    hasLoadedWallets: false,
    setWalletCollections: vi.fn(),
    setWalletCollectionsLoaded: vi.fn(),
  },
  walletCollectionService: {
    loadWalletCollections: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../shared/platform/urlOpener', () => ({
  open: mocks.open,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../stores/modules/AppUpdate', () => ({
  useAppUpdateStore: () => mocks.appUpdateStore,
}))

vi.mock('../../modules/wallet/application/walletCollectionApplicationService', () => ({
  loadWalletCollections: mocks.walletCollectionService.loadWalletCollections,
}))

import { useHomePage } from './useHomePage'

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('useHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.appUpdateStore.currentVersion = 'v0.11.0'
    mocks.appUpdateStore.latestVersion = 'v0.12.0'
    mocks.appUpdateStore.releaseUrl = 'https://example.com/release'
    mocks.appUpdateStore.hasUpdate = true
    mocks.walletsStore.normalWallets = []
    mocks.walletsStore.sharedWallets = []
    mocks.walletsStore.hardwareWallets = []
    mocks.walletsStore.hasLoadedWallets = false
    mocks.walletCollectionService.loadWalletCollections.mockResolvedValue({
      ok: true,
      collections: {
        normalWallets: [{ address: 'AQ123' }],
        sharedWallets: [] as unknown[],
        hardwareWallets: [] as unknown[],
      },
    })
  })

  it('primes wallets on mount and exposes update state from the shared store', async () => {
    const page = useHomePage()
    await flushPromises()

    expect(mocks.walletCollectionService.loadWalletCollections).toHaveBeenCalledWith({
      currentCollections: {
        normalWallets: [] as unknown[],
        sharedWallets: [] as unknown[],
        hardwareWallets: [] as unknown[],
      },
      hasLoadedWallets: false,
    })
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [{ address: 'AQ123' }],
      sharedWallets: [] as unknown[],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(page.version.value).toBe('v0.11.0')
    expect(page.latestVersion.value).toBe('v0.12.0')
    expect(page.hasUpdate.value).toBe(true)
  })

  it('opens the latest release url when available', () => {
    const page = useHomePage()

    page.handleUpdate()

    expect(mocks.open).toHaveBeenCalledWith('https://example.com/release')
  })

  it('does not try to open an empty release url', () => {
    mocks.appUpdateStore.releaseUrl = ''

    const page = useHomePage()
    page.handleUpdate()

    expect(mocks.open).not.toHaveBeenCalled()
  })
})
