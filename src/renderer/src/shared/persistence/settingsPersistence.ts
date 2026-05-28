import { DEFAULT_NETWORK, getDefaultNodeForNetwork, getNodeListForNetwork } from '../lib/constants'
import { normalizeThemeMode } from '../lib/theme'
import { getLocalItem, setLocalItem } from './browserStorage'
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from './storageKeys'

function getNodeAddressHostname(nodeAddress: string) {
  const trimmedNodeAddress = nodeAddress.trim()
  if (!trimmedNodeAddress) {
    return null
  }

  const urlCandidate = /^[a-z]+:\/\//i.test(trimmedNodeAddress)
    ? trimmedNodeAddress
    : `https://${trimmedNodeAddress}`

  try {
    return new URL(urlCandidate).hostname
  } catch {
    return null
  }
}

function normalizeNodeAddress(nodeAddress: unknown, network = getNetwork()) {
  const nodeList = getNodeListForNetwork(network) || []
  const defaultNodeAddress = getDefaultNodeForNetwork(network)

  if (typeof nodeAddress !== 'string' || !nodeAddress.trim()) {
    return defaultNodeAddress
  }

  const trimmedNodeAddress = nodeAddress.trim()
  if (nodeList.includes(trimmedNodeAddress)) {
    return trimmedNodeAddress
  }

  const hostname = getNodeAddressHostname(trimmedNodeAddress)
  if (!hostname) {
    return defaultNodeAddress
  }

  return (
    nodeList.find(
      (candidateNodeAddress) => getNodeAddressHostname(candidateNodeAddress) === hostname
    ) || defaultNodeAddress
  )
}

export function getNetwork() {
  return (
    getLocalItem(LOCAL_STORAGE_KEYS.network, {
      legacyKeys: LEGACY_LOCAL_STORAGE_KEYS.network,
    }) || DEFAULT_NETWORK
  )
}

export function setNetwork(network: unknown) {
  setLocalItem(LOCAL_STORAGE_KEYS.network, network)
}

export function getDefaultNodeAddress(network = getNetwork()) {
  return getDefaultNodeForNetwork(network)
}

export function getNodeAddress() {
  return normalizeNodeAddress(
    getLocalItem(LOCAL_STORAGE_KEYS.nodeAddress, {
      legacyKeys: LEGACY_LOCAL_STORAGE_KEYS.nodeAddress,
    })
  )
}

export function setNodeAddress(nodeAddress: unknown) {
  setLocalItem(LOCAL_STORAGE_KEYS.nodeAddress, normalizeNodeAddress(nodeAddress))
}

export function getThemeMode() {
  return normalizeThemeMode(
    getLocalItem(LOCAL_STORAGE_KEYS.themeMode, {
      legacyKeys: LEGACY_LOCAL_STORAGE_KEYS.themeMode,
    })
  )
}

export function setThemeMode(themeMode: unknown) {
  setLocalItem(LOCAL_STORAGE_KEYS.themeMode, normalizeThemeMode(themeMode))
}
