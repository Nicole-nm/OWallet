import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({
  getCurrentWalletSession: vi.fn(() => ({ address: 'a' })),
  getSharedWalletSession: vi.fn(() => ({ address: 's' })),
  getWalletsTabSession: vi.fn(() => 'normal'),
  setCurrentWalletSession: vi.fn(),
  setSharedWalletSession: vi.fn(),
  setWalletsTabSession: vi.fn(),
}))
const settings = vi.hoisted(() => ({
  getDefaultNodeAddress: vi.fn(() => 'http://default'),
  getNetwork: vi.fn(() => 'MAIN_NET'),
  getNodeAddress: vi.fn(() => 'http://node'),
  getThemeMode: vi.fn(() => 'dark'),
  setNetwork: vi.fn(),
  setNodeAddress: vi.fn(),
  setThemeMode: vi.fn(),
}))

vi.mock('./sessionPersistence', () => session)
vi.mock('./settingsPersistence', () => settings)

import {
  getDefaultNodeAddressForNetwork,
  loadCurrentWalletSession,
  loadNetworkSetting,
  loadNodeAddressSetting,
  loadSharedWalletSession,
  loadThemeModeSetting,
  loadWalletsTabSession,
  saveCurrentWalletSession,
  saveNetworkSetting,
  saveNodeAddressSetting,
  saveSharedWalletSession,
  saveThemeModeSetting,
  saveWalletsTabSession,
} from './appStateService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('appStateService session delegation', () => {
  it('reads and writes the current wallet session', () => {
    expect(loadCurrentWalletSession()).toEqual({ address: 'a' })
    saveCurrentWalletSession({ address: 'b' })
    expect(session.setCurrentWalletSession).toHaveBeenCalledWith({ address: 'b' })
  })

  it('reads and writes the shared wallet session', () => {
    expect(loadSharedWalletSession()).toEqual({ address: 's' })
    saveSharedWalletSession({ address: 't' })
    expect(session.setSharedWalletSession).toHaveBeenCalledWith({ address: 't' })
  })

  it('reads and writes the wallets tab session', () => {
    expect(loadWalletsTabSession()).toBe('normal')
    saveWalletsTabSession('shared')
    expect(session.setWalletsTabSession).toHaveBeenCalledWith('shared')
  })
})

describe('appStateService settings delegation', () => {
  it('reads and writes the network', () => {
    expect(loadNetworkSetting()).toBe('MAIN_NET')
    saveNetworkSetting('TEST_NET')
    expect(settings.setNetwork).toHaveBeenCalledWith('TEST_NET')
  })

  it('resolves the default node address for a network', () => {
    expect(getDefaultNodeAddressForNetwork('MAIN_NET')).toBe('http://default')
    expect(settings.getDefaultNodeAddress).toHaveBeenCalledWith('MAIN_NET')
  })

  it('reads and writes the node address', () => {
    expect(loadNodeAddressSetting()).toBe('http://node')
    saveNodeAddressSetting('http://new')
    expect(settings.setNodeAddress).toHaveBeenCalledWith('http://new')
  })

  it('reads and writes the theme mode', () => {
    expect(loadThemeModeSetting()).toBe('dark')
    saveThemeModeSetting('light')
    expect(settings.setThemeMode).toHaveBeenCalledWith('light')
  })
})
