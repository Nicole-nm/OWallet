import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  walletsStore: {
    normalWallets: [],
    sharedWallets: [],
    hardwareWallets: [
      { address: 'AQ-ledger-old', timestamp: 1, acct: 1 },
      { address: 'AQ-ledger-new', timestamp: 2, acct: 0 },
    ] as Array<{ address: string; timestamp?: number; acct?: number }>,
    activeTab: 'normal',
    hasLoadedWallets: false,
    setActiveTab: vi.fn(),
  },
  hasConfiguredSavePathPreference: vi.fn(),
  loadWalletCollectionsIntoStore: vi.fn(),
}))

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

describe('useWalletsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(true)
    mocks.loadWalletCollectionsIntoStore.mockResolvedValue({ ok: true, collections: {} })
  })

  it('reloads wallet collections with cleanup-safe loading state', async () => {
    const page = useWalletsPage()

    await expect(page.reloadWallets({ force: true })).resolves.toEqual({
      ok: true,
      collections: {},
    })

    expect(mocks.loadWalletCollectionsIntoStore).toHaveBeenCalledWith(mocks.walletsStore, {
      force: true,
    })
    expect(page.walletsErrorKey.value).toBe('')
    expect(page.isLoadingWallets.value).toBe(false)
  })

  it('sets the wallet error key when loading fails', async () => {
    mocks.loadWalletCollectionsIntoStore.mockResolvedValueOnce({
      ok: false,
      errorKey: 'wallets.loadFailed',
    })
    const page = useWalletsPage()

    await expect(page.reloadWallets()).resolves.toEqual({
      ok: false,
      errorKey: 'wallets.loadFailed',
    })

    expect(page.hasWalletLoadError.value).toBe(true)
    expect(page.walletsErrorKey.value).toBe('wallets.loadFailed')
  })

  it('skips a second reload while the first is in flight', async () => {
    let resolveReload!: (value: unknown) => void
    mocks.loadWalletCollectionsIntoStore.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReload = resolve
      })
    )
    const page = useWalletsPage()

    const firstReload = page.reloadWallets()
    expect(page.isLoadingWallets.value).toBe(true)
    await expect(page.reloadWallets()).resolves.toEqual({
      ok: false,
      skipped: true,
      errorKey: 'wallets.loadInProgress',
    })

    resolveReload({ ok: true, collections: {} })
    await expect(firstReload).resolves.toEqual({ ok: true, collections: {} })
    expect(page.isLoadingWallets.value).toBe(false)
  })

  it('sorts hardware wallets by newest timestamp and account index', () => {
    const page = useWalletsPage()

    expect(page.hardwareWalletSort.value.map((wallet) => wallet.address)).toEqual([
      'AQ-ledger-new',
      'AQ-ledger-old',
    ])
  })

  it('uses the fallback key when wallet loading fails without a specific error', async () => {
    mocks.loadWalletCollectionsIntoStore.mockResolvedValueOnce({ ok: false })
    const page = useWalletsPage()

    await expect(page.reloadWallets()).resolves.toEqual({ ok: false })

    expect(page.walletsErrorKey.value).toBe('wallets.loadFailed')
  })

  it('maps rejected wallet loads to a stable error result', async () => {
    mocks.loadWalletCollectionsIntoStore.mockRejectedValueOnce(new Error('disk unavailable'))
    const page = useWalletsPage()

    await expect(page.reloadWallets()).resolves.toMatchObject({
      ok: false,
      errorKey: 'wallets.loadFailed',
      error: expect.any(Error),
    })
  })

  it('forwards active-tab changes and sorts missing hardware metadata as zero', () => {
    mocks.walletsStore.hardwareWallets = [
      { address: 'AQ-no-metadata' },
      { address: 'AQ-account', acct: 2 },
    ]
    const page = useWalletsPage()

    page.activeTab.value = 'hardware'

    expect(mocks.walletsStore.setActiveTab).toHaveBeenCalledWith('hardware')
    expect(page.hardwareWalletSort.value.map((wallet) => wallet.address)).toEqual([
      'AQ-account',
      'AQ-no-metadata',
    ])
  })
})
