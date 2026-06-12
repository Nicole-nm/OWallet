import { ref, type Ref } from 'vue'
import { useSettingStore } from '../../stores/modules/Setting'
import { notifyError } from '../../shared/ui/feedback'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import {
  getWalletAddressExplorerUrl,
  getWalletTransactionExplorerUrl,
  loadWalletTransactions,
} from '../../modules/wallet/application/dashboard/walletDashboardApplicationService'

interface DashboardTransaction {
  txHash: string
  asset: string
  amount: string | number
}

interface WalletTransactionLoadOptions {
  notifyOnError?: boolean
  throwOnError?: boolean
}

function createRefreshFailure(errorKey: string, result: Record<string, unknown>) {
  return {
    category: result.category ?? 'network',
    code: result.code ?? 'network.request_failed',
    detail: typeof result.detail === 'string' ? result.detail : undefined,
    cause: result.error ?? result.cause,
    retryable: result.retryable,
    level: result.level,
    errorKey,
  }
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

  async function getTransactions(options: WalletTransactionLoadOptions = {}) {
    if (!address.value) return false
    const result = await loadWalletTransactions({
      address: address.value,
      network: settingStore.network,
      filterGovernanceOng,
      txSliceCount,
    })
    if (!result.ok) {
      if (options.throwOnError) {
        throw createRefreshFailure('dashboard.getTransErr', result)
      }
      if (options.notifyOnError !== false) {
        notifyError(t('dashboard.getTransErr'), { literal: true })
      }
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
