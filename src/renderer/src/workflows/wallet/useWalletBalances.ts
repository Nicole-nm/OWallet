import { computed, type Ref } from 'vue'
import { notifyError } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useTokensStore } from '../../stores/modules/Tokens'
import { useSettingStore } from '../../stores/modules/Setting'
import {
  loadWalletExchangeValue,
  loadWalletNativeBalance,
} from '../../modules/wallet/application/dashboard/walletDashboardApplicationService'
import { loadSelectedOep4TokenBalances } from '../../modules/wallet/application/transfer/tokenSelectionApplicationService'

export function useWalletBalances({
  address,
  currentWalletStore,
  tokensStore,
  settingStore,
  t,
}: {
  address: Ref<string>
  currentWalletStore: ReturnType<typeof useCurrentWalletStore>
  tokensStore: ReturnType<typeof useTokensStore>
  settingStore: ReturnType<typeof useSettingStore>
  t: (key: string) => string
}) {
  const balance = computed(() => currentWalletStore.balance)
  const oep4s = computed(() => {
    const selected = Object.values(tokensStore.oep4Tokens[settingStore.network] || {})
    if (tokensStore.oep4WithBalances && tokensStore.oep4WithBalances.length > 0) {
      return tokensStore.oep4WithBalances
    }
    return selected.map((token) => ({ ...token, balance: 0 }))
  })

  async function getBalance() {
    if (!address.value) return null
    const result = await loadWalletNativeBalance(address.value)
    if (!result.ok) {
      notifyError(t('dashboard.getBalanceErr'), { literal: true })
      return null
    }

    if (result.balance) {
      currentWalletStore.setNativeBalance({ balance: result.balance as never })
    }
    return result.balance
  }

  async function getOep4Balances() {
    if (!address.value) return []
    const result = await loadSelectedOep4TokenBalances({
      address: address.value,
      selectedTokensByNetwork: tokensStore.oep4Tokens[settingStore.network],
    })
    if (notifyFailure(result, 'common.networkErr')) return []

    tokensStore.setOep4Balances(result.balances)
    return result.balances
  }

  async function getExchangeCurrency() {
    const result = await loadWalletExchangeValue({ amount: balance.value.ont })
    if (result.ok && result.value !== null) {
      currentWalletStore.setNativeBalance({
        balance: {
          ...balance.value,
          ontValue: result.value,
        },
      })
    }
  }

  return {
    balance,
    oep4s,
    getBalance,
    getOep4Balances,
    getExchangeCurrency,
  }
}
