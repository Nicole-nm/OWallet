import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommonWallet, SharedWallet } from '../../shared/lib/types'

const mocks = vi.hoisted(() => ({
  walletsStore: {
    normalWallets: [] as Array<Partial<CommonWallet>>,
    sharedWallets: [] as Array<Partial<SharedWallet>>,
    hardwareWallets: [
      { address: 'AQ-ledger-old', timestamp: 1, acct: 1 },
      { address: 'AQ-ledger-new', timestamp: 2, acct: 0 },
    ] as Array<{ address: string; label?: string; timestamp?: number; acct?: number }>,
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

describe('useWalletsPage filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(true)
    mocks.loadWalletCollectionsIntoStore.mockResolvedValue({ ok: true, collections: {} })

    mocks.walletsStore.normalWallets = [
      { address: 'AN5fHotAddr', label: 'Hot Wallet' },
      { address: 'AN5fColdAddr', label: 'Cold Vault' },
    ]
    mocks.walletsStore.sharedWallets = [
      { sharedWalletAddress: 'AS3Treasury', sharedWalletName: 'Treasury', label: '', address: '' },
      {
        sharedWalletAddress: 'AS3OpsAddr',
        sharedWalletName: 'Ops Multisig',
        label: '',
        address: '',
      },
    ]
    mocks.walletsStore.hardwareWallets = [
      { address: 'AH9LedgerA', label: 'Ledger Alpha', timestamp: 1, acct: 0 },
      { address: 'AH9LedgerB', label: 'Ledger Beta', timestamp: 1, acct: 1 },
    ]
  })

  it('defaults filterQuery to empty and returns every wallet across all three tabs', () => {
    const page = useWalletsPage()

    expect(page.filterQuery.value).toBe('')
    expect(page.normalWallet.value).toHaveLength(2)
    expect(page.sharedWallet.value).toHaveLength(2)
    expect(page.hardwareWalletSort.value).toHaveLength(2)
  })

  it('filters individual wallets by label and address case-insensitively', () => {
    const page = useWalletsPage()

    page.filterQuery.value = 'cold'
    expect(page.normalWallet.value.map((w) => w.label)).toEqual(['Cold Vault'])

    page.filterQuery.value = 'AN5FHOT'
    expect(page.normalWallet.value.map((w) => w.address)).toEqual(['AN5fHotAddr'])
  })

  it('filters shared wallets by sharedWalletName and sharedWalletAddress, not label/address', () => {
    const page = useWalletsPage()

    page.filterQuery.value = 'treasury'
    expect(page.sharedWallet.value.map((w) => w.sharedWalletName)).toEqual(['Treasury'])

    page.filterQuery.value = 'OpsAddr'
    expect(page.sharedWallet.value.map((w) => w.sharedWalletAddress)).toEqual(['AS3OpsAddr'])
  })

  it('filters ledger wallets by label and address', () => {
    const page = useWalletsPage()

    page.filterQuery.value = 'beta'
    expect(page.hardwareWalletSort.value.map((w) => w.label)).toEqual(['Ledger Beta'])

    page.filterQuery.value = 'LedgerA'
    expect(page.hardwareWalletSort.value.map((w) => w.address)).toEqual(['AH9LedgerA'])
  })

  it('trims whitespace-only queries and treats them as no filter', () => {
    const page = useWalletsPage()

    page.filterQuery.value = '   '
    expect(page.normalWallet.value).toHaveLength(2)
    expect(page.sharedWallet.value).toHaveLength(2)
    expect(page.hardwareWalletSort.value).toHaveLength(2)
  })
})

describe('useWalletsPage filteredEmpty flags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocks.hasConfiguredSavePathPreference.mockResolvedValue(true)
    mocks.loadWalletCollectionsIntoStore.mockResolvedValue({ ok: true, collections: {} })

    mocks.walletsStore.normalWallets = [{ address: 'AN5fHotAddr', label: 'Hot Wallet' }]
    mocks.walletsStore.sharedWallets = [
      { sharedWalletAddress: 'AS3Treasury', sharedWalletName: 'Treasury', label: '', address: '' },
    ]
    mocks.walletsStore.hardwareWallets = [
      { address: 'AH9LedgerA', label: 'Ledger Alpha', timestamp: 1, acct: 0 },
    ]
  })

  it('reports filteredEmpty as false on a tab that has no wallets at all', () => {
    mocks.walletsStore.normalWallets = []
    const page = useWalletsPage()

    expect(page.normalWalletEmpty.value).toBe(true)
    expect(page.normalFilteredEmpty.value).toBe(false)
  })

  it('reports filteredEmpty as true when wallets exist but the filter excludes all of them', () => {
    const page = useWalletsPage()
    page.filterQuery.value = 'no-such-wallet-anywhere'

    expect(page.normalWalletEmpty.value).toBe(false)
    expect(page.normalFilteredEmpty.value).toBe(true)
    expect(page.sharedFilteredEmpty.value).toBe(true)
    expect(page.hardwareFilteredEmpty.value).toBe(true)
  })

  it('reports filteredEmpty as false on tabs whose filter still matches at least one wallet', () => {
    const page = useWalletsPage()
    page.filterQuery.value = 'treasury'

    expect(page.sharedFilteredEmpty.value).toBe(false)
    expect(page.normalFilteredEmpty.value).toBe(true)
    expect(page.hardwareFilteredEmpty.value).toBe(true)
  })
})
