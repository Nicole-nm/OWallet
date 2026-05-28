import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { loadAuthorizationStakeHistory } from '../../modules/governance/application/authorizationQueryApplicationService'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { openAuthorizationManagement } from '../../modules/governance/application/authorizationContextService'
import { notifyError } from '../../shared/ui/feedback'
import {
  applyAuthorizationContext,
  applyManagementContext,
} from '../support/governanceContextStoreSync'
import { useStakeWalletSelection } from './useStakeWalletSelection'
import type { GovernanceNode } from '../../shared/types'

interface StakeWalletSelectionPayload {
  wallet: { address?: string }
}

export function useStakeHistoryPage() {
  const router = useRouter()
  const settingStore = useSettingStore()
  const nodeAuthStore = useNodeAuthorizationStore()
  const nodeStakeStore = useNodeStakeStore()
  const nodeSessionStore = useNodeSessionStore()
  const selection = useStakeWalletSelection()
  const requesting = ref(false)
  const historyRecords = computed(() => nodeAuthStore.stakeHistory)
  let latestSearchId = 0

  async function initializePage() {
    selection.cleanupSelection()
    nodeStakeStore.setStakeWallet()
    nodeAuthStore.resetStakeHistory()
    await selection.ensureWalletsLoaded()
  }

  async function search() {
    const stakeWallet = selection.resolveSelectedWallet()
    if (!stakeWallet) {
      nodeAuthStore.resetStakeHistory()
      return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    nodeStakeStore.setStakeWallet({ stakeWallet })
    nodeAuthStore.resetStakeHistory()
    const searchId = ++latestSearchId
    requesting.value = true
    try {
      const result = await loadAuthorizationStakeHistory({
        network: settingStore.network,
        address: stakeWallet.address,
      })

      if (searchId !== latestSearchId) {
        return { ok: false, stale: true }
      }

      nodeAuthStore.setStakeHistory({
        stakeHistory: (result.stakeHistory || []) as Record<string, unknown>[],
      })
      return result
    } finally {
      if (searchId === latestSearchId) {
        requesting.value = false
      }
    }
  }

  function openAuthorization(record: GovernanceNode | Record<string, unknown>) {
    const stakeWallet = selection.resolveSelectedWallet() || {
      address: record?.stakeWallet || '',
    }
    const result = openAuthorizationManagement({
      currentNode: record,
      stakeWallet,
    })

    applyAuthorizationContext(nodeAuthStore, result.authorizationContext)
    applyManagementContext(nodeSessionStore, nodeStakeStore, result.managementContext)
    return router.push(result.route)
  }

  function handleRouteBack() {
    router.go(-1)
  }

  function handleAuthorizeLogin(record: GovernanceNode | Record<string, unknown>) {
    return openAuthorization(record)
  }

  async function handleChangePayer(selectionPayload: StakeWalletSelectionPayload) {
    selection.setSelectedWalletByAddress(selectionPayload.wallet.address || '')
    const result = await search()
    if (!result.ok && !('stale' in result)) {
      notifyError(result.errorKey || 'common.networkErr')
    }
  }

  async function handleSearch() {
    const result = await search()
    if (!result.ok && !('stale' in result)) {
      notifyError(result.errorKey || 'common.networkErr')
    }
    return result
  }

  onMounted(() => {
    void initializePage()
  })

  onBeforeUnmount(() => {
    selection.cleanupSelection()
  })

  return {
    ...selection,
    historyRequesting: requesting,
    historyRecords,
    handleRouteBack,
    handleAuthorizeLogin,
    handleChangePayer,
    handleSearch,
    initializeStakeHistoryPage: initializePage,
    searchStakeHistoryRecords: search,
    openStakeHistoryAuthorization: openAuthorization,
  }
}
