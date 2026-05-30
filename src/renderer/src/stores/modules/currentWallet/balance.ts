import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WalletBalance } from '../../../shared/types'

interface WalletBalanceExtended extends WalletBalance {
  ontValue?: number
}

interface RedeemState {
  claimableOng: number
  balanceOng: number
}

interface BalancePayload {
  balance?: WalletBalanceExtended
}

interface RedeemPayload {
  redeem?: RedeemState
}

interface Nep5OntPayload {
  nep5Ont?: number
}

function createDefaultBalance(): WalletBalanceExtended {
  return {
    ont: 0,
    ong: 0,
    waitBoundOng: 0,
    unboundOng: 0,
  }
}

function createDefaultRedeem(): RedeemState {
  return { claimableOng: 0, balanceOng: 0 }
}

export const useCurrentWalletBalanceStore = defineStore('CurrentWalletBalance', () => {
  const balance = ref<WalletBalanceExtended>(createDefaultBalance())
  const redeem = ref<RedeemState>(createDefaultRedeem())
  const nep5Ont = ref<number>(0)

  function setNativeBalance(payload: BalancePayload = {}) {
    balance.value = payload.balance ?? createDefaultBalance()
  }

  function resetNativeBalance() {
    balance.value = createDefaultBalance()
  }

  function setCurrentRedeem(payload: RedeemPayload = {}) {
    redeem.value = payload.redeem ?? createDefaultRedeem()
  }

  function setNep5Ont(payload: Nep5OntPayload = {}) {
    nep5Ont.value = payload.nep5Ont ?? 0
  }

  return {
    balance,
    redeem,
    nep5Ont,
    setNativeBalance,
    resetNativeBalance,
    setCurrentRedeem,
    setNep5Ont,
  }
})
