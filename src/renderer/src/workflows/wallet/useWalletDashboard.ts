/**
 * Shared wallet dashboard model for wallet pages.
 *
 * This stays in the workflow layer because it coordinates stores, UI feedback,
 * and wallet-specific refresh flows.
 */
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useTokensStore } from '../../stores/modules/Tokens'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSettingStore } from '../../stores/modules/Setting'
import { useWalletBalances } from './useWalletBalances'
import { useWalletTransactions } from './useWalletTransactions'
import { useOep4SelectionModal } from './useOep4SelectionModal'
import { notifyError } from '../../shared/ui/feedback'
import { logger } from '../../shared/lib/logger'

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

  function refresh(showLoading: boolean, extraPromises: Promise<unknown>[] = []) {
    if (requestStart.value) {
      return
    }

    if (showLoading) {
      loadingStore.showLoadingModals()
    }

    requestStart.value = true
    Promise.allSettled([getBalance(), getTransactions(), getOep4Balances(), ...extraPromises]).then(
      (results) => {
        requestStart.value = false
        loadingStore.hideLoadingModals()

        const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        if (failures.length > 0) {
          for (const failure of failures) {
            logger.error('useWalletDashboard.refresh', failure.reason)
          }
          notifyError('common.networkErr')
        }
      }
    )
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
    oep4s,
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
