import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  loadCurrentWalletSession,
  saveCurrentWalletSession,
} from '../../../shared/persistence/appStateService'
import type { CurrentWalletRecord } from '../../../shared/types'

interface WalletPayload {
  wallet?: Partial<CurrentWalletRecord>
}

function createDefaultWallet(): CurrentWalletRecord {
  return {
    publicKey: '',
    address: '',
    name: '',
    label: '',
    coPayers: [],
    requiredNumber: '',
    totalNumber: '',
  }
}

export const useCurrentWalletIdentityStore = defineStore('CurrentWalletIdentity', () => {
  const wallet = ref<CurrentWalletRecord>(
    Object.assign(createDefaultWallet(), loadCurrentWalletSession() || {})
  )

  function setCurrentWallet(payload: WalletPayload = {}) {
    wallet.value = Object.assign(createDefaultWallet(), payload.wallet || {})
    saveCurrentWalletSession(wallet.value)
  }

  function mergeCurrentWallet(payload: WalletPayload = {}) {
    wallet.value = Object.assign({}, wallet.value, payload.wallet)
    saveCurrentWalletSession(wallet.value)
  }

  function resetCurrentWallet() {
    wallet.value = createDefaultWallet()
    saveCurrentWalletSession(wallet.value)
  }

  return { wallet, setCurrentWallet, mergeCurrentWallet, resetCurrentWallet }
})
