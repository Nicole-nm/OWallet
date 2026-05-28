import { computed, type Ref } from 'vue'
import { notifyError } from '../../shared/ui/feedback'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useTokensStore } from '../../stores/modules/Tokens'
import { useSettingStore } from '../../stores/modules/Setting'
import {
  loadWalletExchangeValue,
  loadWalletNativeBalance,
} from '../../modules/wallet/application/walletDashboardApplicationService'
import { loadSelectedOep4TokenBalances } from '../../modules/wallet/application/tokenSelectionApplicationService'

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
  const oep4s = computed(() => tokensStore.oep4WithBalances)

  async function getBalance() {
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
    const result = await loadSelectedOep4TokenBalances({
      address: address.value,
      selectedTokensByNetwork: tokensStore.oep4Tokens[settingStore.network],
    })
    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
      return []
    }

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
