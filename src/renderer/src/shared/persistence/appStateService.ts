import {
  getCurrentWalletSession,
  getSharedWalletSession,
  getWalletsTabSession,
  setCurrentWalletSession,
  setSharedWalletSession,
  setWalletsTabSession,
} from './sessionPersistence'
import {
  getDefaultNodeAddress,
  getNetwork,
  getNodeAddress,
  getThemeMode,
  setNetwork,
  setNodeAddress,
  setThemeMode,
} from './settingsPersistence'
import type { CurrentWalletRecord } from '../types/wallet'

export function loadCurrentWalletSession() {
  return getCurrentWalletSession()
}

export function saveCurrentWalletSession(wallet: CurrentWalletRecord | Record<string, unknown>) {
  setCurrentWalletSession(wallet)
}

export function loadSharedWalletSession() {
  return getSharedWalletSession()
}

export function saveSharedWalletSession(wallet: Record<string, unknown>) {
  setSharedWalletSession(wallet)
}

export function loadWalletsTabSession() {
  return getWalletsTabSession()
}

export function saveWalletsTabSession(tabKey: string) {
  setWalletsTabSession(tabKey)
}

export function loadNetworkSetting() {
  return getNetwork()
}

export function saveNetworkSetting(network: string) {
  setNetwork(network)
}

export function getDefaultNodeAddressForNetwork(network: string) {
  return getDefaultNodeAddress(network)
}

export function loadNodeAddressSetting() {
  return getNodeAddress()
}

export function saveNodeAddressSetting(nodeAddress: string) {
  setNodeAddress(nodeAddress)
}

export function loadThemeModeSetting() {
  return getThemeMode()
}

export function saveThemeModeSetting(themeMode: string) {
  setThemeMode(themeMode)
}
