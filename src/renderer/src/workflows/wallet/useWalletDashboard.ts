/**
 * Shared wallet dashboard model for wallet pages.
 *
 * This stays in the workflow layer because it coordinates stores, UI feedback,
 * and wallet-specific refresh flows.
 */
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useTokensStore } from '../../stores/modules/Tokens'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSettingStore } from '../../stores/modules/Setting'
import { useWalletBalances } from './useWalletBalances'
import { useWalletTransactions } from './useWalletTransactions'
import { useOep4SelectionModal } from './useOep4SelectionModal'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import {
  runWalletDashboardRefresh,
  type WalletDashboardRefreshResult,
  type WalletDashboardRefreshTask,
} from './useWalletDashboardRefresh'

export function useWalletDashboard(
  address: Ref<string>,
  options: { filterGovernanceOng?: boolean; txSliceCount?: number } = {}
) {
  const { filterGovernanceOng = false, txSliceCount = 10 } = options

  const { t } = useI18n()
  const currentWalletStore = useCurrentWalletStore()
  const tokensStore = useTokensStore()
  const loadingStore = useLoadingModalStore()
  const settingStore = useSettingStore()

  const requestStart = ref(false)
  const redeemInfoVisible = ref(false)
  const { balance, oep4s, getBalance, getOep4Balances, getExchangeCurrency } = useWalletBalances({
    address,
    currentWalletStore,
    tokensStore,
    settingStore,
    t,
  })
  const balanceDisplay = computed(() => ({
    ...balance.value,
    ont: formatNumberForDisplay(balance.value.ont),
    ong: formatNumberForDisplay(balance.value.ong),
    unboundOng: formatNumberForDisplay(balance.value.unboundOng),
    waitBoundOng: formatNumberForDisplay(balance.value.waitBoundOng),
  }))
  const oep4sDisplay = computed(() =>
    oep4s.value.map((token) => ({
      ...token,
      balanceDisplay: formatNumberForDisplay(token.balance),
    }))
  )
  const { completedTx, showTxDetail, checkMoreTx, getTransactions } = useWalletTransactions({
    address,
    settingStore,
    filterGovernanceOng,
    txSliceCount,
    t,
  })
  const {
    showOep4Selection,
    oep4SelectionItems,
    oep4SelectionPageNumber,
    oep4SelectionTotal,
    fetchSelectableOep4Tokens,
    addOep4,
    handleOep4SelectionOpenChange,
    handleOep4SelectionPageChange,
    toggleOep4Selection,
  } = useOep4SelectionModal({
    tokensStore,
    settingStore,
    getOep4Balances,
  })

  function refresh(
    showLoading: boolean,
    extraTasks: WalletDashboardRefreshTask[] = []
  ): Promise<WalletDashboardRefreshResult> {
    return runWalletDashboardRefresh({
      requestStart,
      showLoading,
      loadingStore,
      tasks: [
        () => getBalance({ notifyOnError: false, throwOnError: true }),
        () => getTransactions({ notifyOnError: false, throwOnError: true }),
        () => getOep4Balances({ notifyOnError: false, throwOnError: true }),
        ...extraTasks,
      ],
    })
  }

  function handleModalOk() {
    redeemInfoVisible.value = false
  }

  return {
    completedTx,
    requestStart,
    redeemInfoVisible,
    showOep4Selection,
    oep4SelectionItems,
    oep4SelectionPageNumber,
    oep4SelectionTotal,
    balance,
    balanceDisplay,
    oep4s,
    oep4sDisplay,
    showTxDetail,
    checkMoreTx,
    getBalance,
    getOep4Balances,
    getExchangeCurrency,
    getTransactions,
    refresh,
    handleModalOk,
    addOep4,
    fetchSelectableOep4Tokens,
    handleOep4SelectionOpenChange,
    handleOep4SelectionPageChange,
    toggleOep4Selection,
    currentWalletStore,
    tokensStore,
    loadingStore,
    settingStore,
  }
}
