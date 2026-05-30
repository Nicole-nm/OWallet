import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getNodeListForNetwork: vi.fn(),
  isTestNetNetwork: vi.fn(),
  setLanguage: vi.fn(),
  loadConfiguredSavePath: vi.fn(() => '/path'),
  hasConfiguredSavePathSetting: vi.fn(() => true),
  selectAndPersistSavePath: vi.fn(() => ({ ok: true })),
}))

vi.mock('../../../shared/lib/constants', () => ({
  DEFAULT_NETWORK: 'MAIN_NET',
  NETWORKS: { MAIN_NET: 'MAIN_NET', TEST_NET: 'TEST_NET' },
  getNodeListForNetwork: mocks.getNodeListForNetwork,
  isTestNetNetwork: mocks.isTestNetNetwork,
}))

vi.mock('../../../shared/lib/theme', () => ({ THEME_MODES: ['light', 'dark'] }))

vi.mock('../../../shared/persistence/languagePersistence', () => ({
  setLanguage: mocks.setLanguage,
}))

vi.mock('../../../shared/persistence/savePathService', () => ({
  hasConfiguredSavePathSetting: mocks.hasConfiguredSavePathSetting,
  loadConfiguredSavePath: mocks.loadConfiguredSavePath,
  selectAndPersistSavePath: mocks.selectAndPersistSavePath,
}))

import {
  changeApplicationLanguage,
  changeNetworkPreference,
  changeNodeAddressPreference,
  changeThemeModePreference,
  hasConfiguredSavePathPreference,
  loadConfiguredSavePathPreference,
  loadSettingsPageState,
  selectAndPersistSavePathPreference,
} from './settingsPreferencesApplicationService'

function makeStore() {
  return {
    network: 'MAIN_NET',
    nodeAddress: 'http://node1',
    themeMode: 'dark',
    setNetwork: vi.fn(),
    setNodeAddress: vi.fn(),
    setThemeMode: vi.fn(),
  }
}

const translate = (key: string) => `t:${key}`

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getNodeListForNetwork.mockReturnValue(['http://node1', 'http://node2'])
})

describe('loadSettingsPageState', () => {
  it('returns normalized network state with a valid node address', () => {
    const state = loadSettingsPageState({ settingStore: makeStore(), language: 'en' })
    expect(state).toMatchObject({ ok: true, network: 'MAIN_NET', nodeAddress: 'http://node1' })
  })

  it('falls back to the first node when the stored address is invalid', () => {
    const store = makeStore()
    store.nodeAddress = 'http://unknown'
    const state = loadSettingsPageState({ settingStore: store, language: 'en' })
    expect(state.nodeAddress).toBe('http://node1')
  })

  it('normalizes an unknown network to the default', () => {
    const store = makeStore()
    store.network = 'BOGUS' as never
    const state = loadSettingsPageState({ settingStore: store, language: 'en' })
    expect(state.network).toBe('MAIN_NET')
  })
})

describe('changeNetworkPreference', () => {
  it('switches the network and produces a testnet label when translating', () => {
    mocks.isTestNetNetwork.mockReturnValue(true)
    const store = makeStore()
    const result = changeNetworkPreference('TEST_NET', { settingStore: store, translate })
    expect(store.setNetwork).toHaveBeenCalledWith('TEST_NET')
    expect(store.setNodeAddress).toHaveBeenCalledWith('http://node1')
    expect(result.message).toContain('t:common.testNet')
  })

  it('produces a mainnet label when not a testnet', () => {
    mocks.isTestNetNetwork.mockReturnValue(false)
    const result = changeNetworkPreference('MAIN_NET', { settingStore: makeStore(), translate })
    expect(result.message).toContain('t:common.mainNet')
  })

  it('returns an empty message when no translator is provided', () => {
    const result = changeNetworkPreference('MAIN_NET', { settingStore: makeStore() })
    expect(result.message).toBe('')
  })
})

describe('changeNodeAddressPreference', () => {
  it('persists a valid node address with a success message', () => {
    const store = makeStore()
    const result = changeNodeAddressPreference('http://node2', { settingStore: store, translate })
    expect(store.setNodeAddress).toHaveBeenCalledWith('http://node2')
    expect(result.message).toContain('http://node2')
  })

  it('falls back to the first node for an invalid address', () => {
    const store = makeStore()
    const result = changeNodeAddressPreference('http://bad', { settingStore: store })
    expect(result.nodeAddress).toBe('http://node1')
  })
})

describe('other preference setters', () => {
  it('changeThemeModePreference delegates to the store', () => {
    const store = makeStore()
    expect(changeThemeModePreference('light', { settingStore: store }).themeMode).toBe('dark')
    expect(store.setThemeMode).toHaveBeenCalledWith('light')
  })

  it('save path preferences delegate to the service', () => {
    expect(loadConfiguredSavePathPreference()).toBe('/path')
    expect(hasConfiguredSavePathPreference()).toBe(true)
    expect(selectAndPersistSavePathPreference()).toEqual({ ok: true })
  })

  it('changeApplicationLanguage persists the language', () => {
    expect(changeApplicationLanguage('zh')).toEqual({ ok: true, language: 'zh' })
    expect(mocks.setLanguage).toHaveBeenCalledWith('zh')
  })
})
