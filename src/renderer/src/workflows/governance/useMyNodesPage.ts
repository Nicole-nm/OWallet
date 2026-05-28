import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useSettingStore } from '../../stores/modules/Setting'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { loadMyNodeCards } from '../../modules/governance/application/queryApplicationService'
import { openNodeManagement as openNodeManagementRoute } from '../../modules/governance/application/managementContextService'
import { notifyError } from '../../shared/ui/feedback'
import { applyManagementContext } from '../support/governanceContextStoreSync'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import { createLogger } from '../../shared/lib/logger'
import { handleWorkflowError } from '../../shared/lib/workflowErrorHandler'

const logger = createLogger('useMyNodesPage')

type MyNodeListItem = Record<string, unknown> & {
  publicKey: string
  stakeWallet?: unknown
  status?: unknown
}

export function useMyNodesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const walletsStore = useWalletsStore()
  const settingStore = useSettingStore()
  const loadingStore = useLoadingModalStore()
  const nodeStakeStore = useNodeStakeStore()
  const nodeSessionStore = useNodeSessionStore()
  const myNodes = ref<MyNodeListItem[]>([])
  const hasInitialized = ref(false)

  const localWallets = computed(() => [
    ...walletsStore.normalWallets,
    ...walletsStore.hardwareWallets,
  ])

  async function ensureWalletsLoaded() {
    await loadWalletCollectionsIntoStore(walletsStore)
    return localWallets.value
  }

  async function loadMyNodes() {
    loadingStore.showLoadingModals()

    try {
      const result = await loadMyNodeCards({
        network: settingStore.network,
        wallets: localWallets.value,
      })

      if (!result.ok) {
        notifyError(result.errorKey)
      }

      return result.nodes
    } catch (err: unknown) {
      handleWorkflowError({
        error: err,
        logger,
        context: 'loadMyNodes',
        errorKey: 'common.networkErr',
      })
      return []
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  async function syncMyNodes() {
    if (localWallets.value.length === 0) {
      myNodes.value = []
      return
    }

    myNodes.value = (await loadMyNodes()) as MyNodeListItem[]
  }

  function openNodeManagement(node: MyNodeListItem) {
    const result = openNodeManagementRoute({
      context: {
        stakeWallet: node.stakeWallet,
        nodePublicKey: node.publicKey,
        status: node.status,
        activeTab: 1,
      },
    })
    applyManagementContext(nodeSessionStore, nodeStakeStore, result.context)
    return router.push(result.route)
  }

  function back() {
    router.back()
  }

  onMounted(async () => {
    await ensureWalletsLoaded()
    hasInitialized.value = true
    await syncMyNodes()
  })

  watch(localWallets, async () => {
    if (!hasInitialized.value) {
      return
    }

    await syncMyNodes()
  })

  return {
    t,
    myNodes,
    back,
    localWallets,
    ensureWalletsLoaded,
    loadMyNodes,
    onManage: openNodeManagement,
  }
}
