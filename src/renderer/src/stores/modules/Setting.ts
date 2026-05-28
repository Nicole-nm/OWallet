import { defineStore } from 'pinia'
import { DEFAULT_NETWORK, getDefaultNodeForNetwork } from '../../shared/lib/constants'
import { normalizeResolvedTheme, normalizeThemeMode, resolveTheme } from '../../shared/lib/theme'
import type { NetworkId } from '../../shared/lib/types'
import {
  getDefaultNodeAddressForNetwork,
  loadNetworkSetting,
  loadNodeAddressSetting,
  loadThemeModeSetting,
  saveNetworkSetting,
  saveNodeAddressSetting,
  saveThemeModeSetting,
} from '../../shared/persistence/appStateService'

export const useSettingStore = defineStore('Setting', {
  state: () => ({
    network: (loadNetworkSetting() || DEFAULT_NETWORK) as NetworkId,
    nodeAddress: loadNodeAddressSetting() || getDefaultNodeForNetwork(DEFAULT_NETWORK),
    themeMode: loadThemeModeSetting(),
    resolvedTheme: resolveTheme(loadThemeModeSetting()),
    connected: false,
  }),
  actions: {
    setNetwork(network: NetworkId) {
      this.network = network
      saveNetworkSetting(network)
    },
    setNodeAddress(nodeAddress: string) {
      this.nodeAddress = nodeAddress
      saveNodeAddressSetting(nodeAddress)
    },
    setThemeMode(themeMode: string) {
      const normalizedThemeMode = normalizeThemeMode(themeMode)
      this.themeMode = normalizedThemeMode
      saveThemeModeSetting(normalizedThemeMode)
      this.resolvedTheme = resolveTheme(normalizedThemeMode)
    },
    setResolvedTheme(theme: string) {
      this.resolvedTheme = normalizeResolvedTheme(theme)
    },
    resetNodeAddress() {
      const nodeAddress = getDefaultNodeAddressForNetwork(this.network) || ''
      this.nodeAddress = nodeAddress
      saveNodeAddressSetting(nodeAddress)
    },
    setConnected(connected: boolean) {
      this.connected = connected
    },
    networkConnected() {
      this.setConnected(true)
    },
    networkDisconnected() {
      this.setConnected(false)
    },
  },
})
