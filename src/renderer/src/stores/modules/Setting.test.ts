import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const persistence = vi.hoisted(() => ({
  getDefaultNodeAddressForNetwork: vi.fn(() => 'http://default-node'),
  loadNetworkSetting: vi.fn(() => ''),
  loadNodeAddressSetting: vi.fn(() => ''),
  loadThemeModeSetting: vi.fn(() => 'system'),
  saveNetworkSetting: vi.fn(),
  saveNodeAddressSetting: vi.fn(),
  saveThemeModeSetting: vi.fn(),
}))

vi.mock('../../shared/persistence/appStateService', () => persistence)

import { useSettingStore } from './Setting'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useSettingStore', () => {
  it('persists the selected network', () => {
    const store = useSettingStore()
    store.setNetwork('TEST_NET' as never)

    expect(store.network).toBe('TEST_NET')
    expect(persistence.saveNetworkSetting).toHaveBeenCalledWith('TEST_NET')
  })

  it('persists the node address', () => {
    const store = useSettingStore()
    store.setNodeAddress('http://node')

    expect(store.nodeAddress).toBe('http://node')
    expect(persistence.saveNodeAddressSetting).toHaveBeenCalledWith('http://node')
  })

  it('normalizes and persists the theme mode and resolved theme', () => {
    const store = useSettingStore()
    store.setThemeMode('dark')

    expect(store.themeMode).toBe('dark')
    expect(store.resolvedTheme).toBe('dark')
    expect(persistence.saveThemeModeSetting).toHaveBeenCalledWith('dark')
  })

  it('resets the node address to the network default', () => {
    persistence.getDefaultNodeAddressForNetwork.mockReturnValue('http://reset-node')
    const store = useSettingStore()

    store.resetNodeAddress()

    expect(store.nodeAddress).toBe('http://reset-node')
    expect(persistence.saveNodeAddressSetting).toHaveBeenCalledWith('http://reset-node')
  })

  it('toggles the connected flag through the helper actions', () => {
    const store = useSettingStore()

    store.networkConnected()
    expect(store.connected).toBe(true)

    store.networkDisconnected()
    expect(store.connected).toBe(false)
  })
})
