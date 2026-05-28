import { ref, type Ref } from 'vue'
import { useSettingStore } from '../../stores/modules/Setting'
import { notifyError } from '../../shared/ui/feedback'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import {
  getWalletAddressExplorerUrl,
  getWalletTransactionExplorerUrl,
  loadWalletTransactions,
} from '../../modules/wallet/application/walletDashboardApplicationService'

interface DashboardTransaction {
  txHash: string
  asset: string
  amount: string | number
}

export function useWalletTransactions({
  address,
  settingStore,
  filterGovernanceOng,
  txSliceCount,
  t,
}: {
  address: Ref<string>
  settingStore: ReturnType<typeof useSettingStore>
  filterGovernanceOng: boolean
  txSliceCount: number
  t: (key: string) => string
}) {
  const completedTx = ref<DashboardTransaction[]>([])

  function showTxDetail(txHash: string) {
    openExternalUrl(getWalletTransactionExplorerUrl({ txHash, network: settingStore.network }))
  }

  function checkMoreTx() {
    openExternalUrl(
      getWalletAddressExplorerUrl({ address: address.value, network: settingStore.network })
    )
  }

  async function getTransactions() {
    const result = await loadWalletTransactions({
      address: address.value,
      network: settingStore.network,
      filterGovernanceOng,
      txSliceCount,
    })
    if (!result.ok) {
      notifyError(t('dashboard.getTransErr'), { literal: true })
      return false
    }

    completedTx.value = result.transactions
    return result.transactions
  }

  return {
    completedTx,
    showTxDetail,
    checkMoreTx,
    getTransactions,
  }
}
