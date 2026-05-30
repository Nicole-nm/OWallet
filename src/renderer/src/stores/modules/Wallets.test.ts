import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const persistence = vi.hoisted(() => ({
  loadWalletsTabSession: vi.fn(() => 'normal'),
  saveWalletsTabSession: vi.fn(),
}))

vi.mock('../../shared/persistence/appStateService', () => persistence)

import { useWalletsStore } from './Wallets'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  persistence.loadWalletsTabSession.mockReturnValue('normal')
})

describe('useWalletsStore', () => {
  it('normalizes partial wallet collections, defaulting missing groups to []', () => {
    const store = useWalletsStore()
    store.setWalletCollections({ normalWallets: [{ address: 'a' }] as never })

    expect(store.normalWallets).toEqual([{ address: 'a' }])
    expect(store.sharedWallets).toEqual([])
    expect(store.hardwareWallets).toEqual([])
  })

  it('tracks the loaded flag', () => {
    const store = useWalletsStore()
    expect(store.hasLoadedWallets).toBe(false)
    store.setWalletCollectionsLoaded(true)
    expect(store.hasLoadedWallets).toBe(true)
  })

  it('removes a common wallet by address and ignores unknown addresses', () => {
    const store = useWalletsStore()
    store.setWalletCollections({
      normalWallets: [{ address: 'a' }, { address: 'b' }] as never,
    })

    store.deleteCommonWallet('missing')
    expect(store.normalWallets).toHaveLength(2)

    store.deleteCommonWallet('a')
    expect(store.normalWallets).toEqual([{ address: 'b' }])
  })

  it('removes shared wallets keyed by sharedWalletAddress', () => {
    const store = useWalletsStore()
    store.setWalletCollections({
      sharedWallets: [{ sharedWalletAddress: 's1' }, { sharedWalletAddress: 's2' }] as never,
    })

    store.deleteSharedWallet('s1')
    expect(store.sharedWallets).toEqual([{ sharedWalletAddress: 's2' }])
  })

  it('removes hardware wallets by address', () => {
    const store = useWalletsStore()
    store.setWalletCollections({ hardwareWallets: [{ address: 'h1' }] as never })

    store.deleteHardwareWallet('h1')
    expect(store.hardwareWallets).toEqual([])
  })

  it('persists the active tab when it changes', () => {
    const store = useWalletsStore()
    store.setActiveTab('shared')

    expect(store.activeTab).toBe('shared')
    expect(persistence.saveWalletsTabSession).toHaveBeenCalledWith('shared')
  })

  it('resets collections and the loaded flag', () => {
    const store = useWalletsStore()
    store.setWalletCollections({ normalWallets: [{ address: 'a' }] as never })
    store.setWalletCollectionsLoaded(true)

    store.resetWalletCollections()

    expect(store.normalWallets).toEqual([])
    expect(store.hasLoadedWallets).toBe(false)
  })
})
