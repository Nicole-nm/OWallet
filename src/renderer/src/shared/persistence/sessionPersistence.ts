import { getSessionItem, getSessionJson, setSessionItem, setSessionJson } from './browserStorage'
import { LEGACY_SESSION_STORAGE_KEYS, SESSION_STORAGE_KEYS } from './storageKeys'

export function getCurrentWalletSession() {
  return getSessionJson(SESSION_STORAGE_KEYS.currentWallet, {
    legacyKeys: LEGACY_SESSION_STORAGE_KEYS.currentWallet,
  })
}

export function setCurrentWalletSession(wallet: unknown) {
  setSessionJson(SESSION_STORAGE_KEYS.currentWallet, wallet)
}

export function getSharedWalletSession() {
  return getSessionJson(SESSION_STORAGE_KEYS.sharedWallet, {
    legacyKeys: LEGACY_SESSION_STORAGE_KEYS.sharedWallet,
  })
}

export function setSharedWalletSession(wallet: unknown) {
  setSessionJson(SESSION_STORAGE_KEYS.sharedWallet, wallet)
}

export function getWalletsTabSession() {
  return (
    getSessionItem(SESSION_STORAGE_KEYS.walletsTab, {
      legacyKeys: LEGACY_SESSION_STORAGE_KEYS.walletsTab,
    }) || '1'
  )
}

export function setWalletsTabSession(tabKey: unknown) {
  setSessionItem(SESSION_STORAGE_KEYS.walletsTab, tabKey)
}
