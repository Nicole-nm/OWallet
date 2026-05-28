import { defineStore } from 'pinia'
import {
  loadSharedWalletSession,
  saveSharedWalletSession,
} from '../../shared/persistence/appStateService'
import type { SharedWalletSession } from '../../shared/types'

function createDefaultSharedWalletSession(): SharedWalletSession {
  return {
    sharedWalletAddress: '',
    sharedWalletName: '',
    coPayers: [],
    requiredNumber: 0,
    totalNumber: 0,
  }
}

export const useSharedWalletSessionStore = defineStore('SharedWalletSession', {
  state: () => ({
    wallet: Object.assign(createDefaultSharedWalletSession(), loadSharedWalletSession() || {}),
  }),
  actions: {
    setSharedWallet(wallet: Partial<SharedWalletSession> = {}) {
      this.wallet = Object.assign(createDefaultSharedWalletSession(), wallet)
      saveSharedWalletSession(this.wallet)
    },
    resetSharedWallet() {
      this.wallet = createDefaultSharedWalletSession()
      saveSharedWalletSession(this.wallet)
    },
  },
})
