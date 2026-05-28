import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { syncManagementContextFromSession } from '../../modules/governance/application/managementContextService'
import { applyManagementContext } from '../support/governanceContextStoreSync'

const DEFAULT_TAB_KEY = '1'

export function useNodeStakeManagementPage() {
  const router = useRouter()
  const nodeStakeStore = useNodeStakeStore()
  const nodeSessionStore = useNodeSessionStore()

  const activeTab = computed({
    get() {
      return String(nodeSessionStore.activeManagementTab || DEFAULT_TAB_KEY)
    },
    set(value) {
      const tabIndex = Number(value || DEFAULT_TAB_KEY)
      nodeSessionStore.setActiveManagementTab(tabIndex)
    },
  })

  function initializeManagementContext() {
    const result = syncManagementContextFromSession({
      sessionContext: {
        stakeWallet: nodeSessionStore.selectedStakeWallet,
        nodePublicKey: nodeSessionStore.selectedNodePublicKey,
        status: nodeSessionStore.selectedStatus,
        activeTab: nodeSessionStore.activeManagementTab,
      },
      fallbackContext: {
        stakeWallet: nodeStakeStore.stakeWallet,
        nodePublicKey: nodeStakeStore.nodePublicKey,
        status: nodeStakeStore.nodeStatus,
        activeTab: nodeSessionStore.activeManagementTab || Number(DEFAULT_TAB_KEY),
      },
    })
    applyManagementContext(nodeSessionStore, nodeStakeStore, result.context)
    return result.context
  }

  function handleRouteBack() {
    router.go(-1)
  }

  onMounted(() => {
    initializeManagementContext()
  })

  return {
    activeTab,
    handleRouteBack,
    initializeManagementContext,
  }
}
