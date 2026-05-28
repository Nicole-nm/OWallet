import { defineStore } from 'pinia'
import type { WalletCollections } from '../../shared/lib/types'
import {
  loadWalletsTabSession,
  saveWalletsTabSession,
} from '../../shared/persistence/appStateService'

function normalizeWalletCollections(payload: Partial<WalletCollections> = {}): WalletCollections {
  return {
    normalWallets: payload.normalWallets ?? [],
    sharedWallets: payload.sharedWallets ?? [],
    hardwareWallets: payload.hardwareWallets ?? [],
  }
}

export const useWalletsStore = defineStore('Wallets', {
  state: () => ({
    normalWallets: [] as WalletCollections['normalWallets'],
    sharedWallets: [] as WalletCollections['sharedWallets'],
    hardwareWallets: [] as WalletCollections['hardwareWallets'],
    activeTab: loadWalletsTabSession() as string,
    hasLoadedWallets: false,
  }),
  actions: {
    setWalletCollections(collections: Partial<WalletCollections> = {}) {
      const normalizedCollections = normalizeWalletCollections(collections)
      this.normalWallets = normalizedCollections.normalWallets
      this.sharedWallets = normalizedCollections.sharedWallets
      this.hardwareWallets = normalizedCollections.hardwareWallets
    },
    setWalletCollectionsLoaded(loaded: boolean) {
      this.hasLoadedWallets = loaded
    },
    deleteCommonWallet(address: string) {
      const normalWallet = this.normalWallets.slice()
      const index = normalWallet.findIndex((w) => w.address === address)
      if (index < 0) return
      normalWallet.splice(index, 1)
      this.normalWallets = normalWallet
    },
    deleteSharedWallet(address: string) {
      const normalWallet = this.sharedWallets.slice()
      const index = normalWallet.findIndex((w) => w.sharedWalletAddress === address)
      if (index < 0) return
      normalWallet.splice(index, 1)
      this.sharedWallets = normalWallet
    },
    deleteHardwareWallet(address: string) {
      const normalWallet = this.hardwareWallets.slice()
      const index = normalWallet.findIndex((w) => w.address === address)
      if (index < 0) return
      normalWallet.splice(index, 1)
      this.hardwareWallets = normalWallet
    },
    setActiveTab(activeTab: string) {
      this.activeTab = activeTab
      saveWalletsTabSession(activeTab)
    },
    resetWalletCollections() {
      this.setWalletCollections({})
      this.setWalletCollectionsLoaded(false)
    },
  },
})
