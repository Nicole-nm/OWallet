import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { canOpenNewAuthorization } from '../../modules/governance/application/authorization/authorizationManagementApplicationService'
import { refreshAuthorizationOverview } from '../../modules/governance/application/authorization/authorizationQueryApplicationService'
import { ROUTE_NAMES } from '../../router/routes'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import { notifyWarning } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useAuthorizationTransactions } from './useAuthorizationTransactions'
import type { GovernanceSignablePayload } from '../../modules/governance/application/common/governanceSignablePayload'

function applyAuthorizationOverview(nodeAuthStore: unknown, result: Record<string, unknown>) {
  const store = nodeAuthStore as {
    currentNode: Record<string, unknown>
    setAuthorizationInfo(payload: { authorizationInfo: unknown }): void
    setSplitFee(payload: { splitFee: unknown }): void
    setPeerAttributes(payload: { peerAttributes: unknown }): void
    setPeerUnboundOng(payload: { peerUnboundOng: unknown }): void
    setCurrentPeer(payload: { peer: unknown }): void
    setCurrentNode(payload: { currentNode: unknown }): void
  }
  store.setAuthorizationInfo({ authorizationInfo: result.authorizationInfo })
  store.setSplitFee({ splitFee: result.splitFee })
  store.setPeerAttributes({ peerAttributes: result.peerAttributes })
  store.setPeerUnboundOng({ peerUnboundOng: result.peerUnboundOng })
  store.setCurrentPeer({ peer: result.currentPeer })

  const peerAttributes = (result.peerAttributes ?? {}) as Record<string, unknown>
  const currentPeer = (result.currentPeer ?? {}) as Record<string, unknown>
  store.setCurrentNode({
    currentNode: {
      ...store.currentNode,
      maxAuthorize: peerAttributes.maxAuthorize,
      maxAuthorizeStr: peerAttributes.maxAuthorizeStr,
      totalPos: currentPeer.totalPos,
      totalPosStr: currentPeer.totalPosStr,
    },
  })
}

export function useAuthorizationManagementPage() {
  const router = useRouter()
  const nodeAuthStore = useNodeAuthorizationStore()
  const loadingStore = useLoadingModalStore()
  const nodeStakeStore = useNodeStakeStore()

  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')

  const currentNode = computed(() => nodeAuthStore.currentNode)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const splitFee = computed(() => nodeAuthStore.splitFee)
  const authorizationInfo = computed(() => nodeAuthStore.authorizationInfo)
  const peerAttrs = computed(() => nodeAuthStore.peerAttributes)
  const unboundOng = computed(() => nodeAuthStore.peerUnboundOng)
  const splitFeeAmountDisplay = computed(() => formatNumberForDisplay(splitFee.value.amount))
  const unboundOngDisplay = computed(() => formatNumberForDisplay(unboundOng.value))

  function resolveContext() {
    const address = stakeWallet.value?.address || ''
    const pk =
      currentNode.value?.publicKey ||
      currentNode.value?.nodePublicKey ||
      currentNode.value?.pk ||
      ''
    return { address, pk }
  }

  function resolveStakeWallet() {
    const wallet = stakeWallet.value
    return wallet?.address ? wallet : null
  }

  const { redeemSplitFeeRewards, redeemClaimableOnt, redeemPeerUnboundOng } =
    useAuthorizationTransactions({
      signVisible,
      tx,
      currentNode,
      authorizationInfo,
      splitFee,
      unboundOng,
      resolveStakeWallet,
    })

  const { startPolling, stopPolling } = usePollingTask(refreshAuthorizationDetails, {
    autoStart: false,
    intervalMs: 10000,
  })

  async function refreshAuthorizationDetails({ showError = false } = {}) {
    const { address, pk } = resolveContext()
    if (!address || !pk) {
      return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
    }

    const result = await refreshAuthorizationOverview({
      address,
      pk,
    })

    if (result.ok) {
      applyAuthorizationOverview(nodeAuthStore, result)
    }

    if (!result.ok && showError) {
      return result
    }

    return result
  }

  async function initializeAuthorizationManagementPage() {
    loadingStore.showLoadingModals()

    try {
      await refreshAuthorizationDetails({ showError: true })
    } finally {
      loadingStore.hideLoadingModals()
      startPolling({ immediate: false })
    }
  }

  function disposeAuthorizationManagementPage() {
    stopPolling()
  }

  function openNewAuthorizationPage() {
    const result = canOpenNewAuthorization({ peerAttrs: peerAttrs.value })
    if (!result.ok) {
      return result
    }

    router.push({ name: ROUTE_NAMES.NEW_AUTHORIZATION })
    return { ok: true as const }
  }

  function openAuthorizationWalletSwitch() {
    router.push({ name: ROUTE_NAMES.AUTHORIZE_LOGIN })
  }

  async function triggerRefresh() {
    loadingStore.showLoadingModals()
    const result = await refreshAuthorizationDetails({ showError: true })
    setTimeout(() => {
      loadingStore.hideLoadingModals()
    }, 100)
    return result
  }

  function closeSignDialog() {
    signVisible.value = false
    tx.value = ''
  }

  function handleTransactionSent() {
    signVisible.value = false
    void refreshAuthorizationDetails()
    tx.value = ''
  }

  function handleRouteBack() {
    router.go(-1)
  }

  function newStakeAuthorization() {
    const result = openNewAuthorizationPage()
    if (!result.ok) {
      notifyWarning(result.errorKey)
    }
    return result
  }

  function switchWallet() {
    return openAuthorizationWalletSwitch()
  }

  async function handleRefresh() {
    const result = await triggerRefresh()
    notifyFailure(result)
    return result
  }

  function handleCancel() {
    closeSignDialog()
  }

  function handleTxSent() {
    handleTransactionSent()
  }

  async function redeemRewards() {
    const result = await redeemSplitFeeRewards()
    if (!result.ok) {
      notifyWarning(result.errorKey)
    }
    return result
  }

  function cancelAuthorization() {
    router.push({ name: ROUTE_NAMES.CANCEL_AUTHORIZATION })
  }

  async function redeemOnt() {
    const result = await redeemClaimableOnt()
    notifyFailure(result)
    return result
  }

  onMounted(() => {
    void initializeAuthorizationManagementPage()
  })

  onBeforeUnmount(() => {
    disposeAuthorizationManagementPage()
  })

  return {
    currentNode,
    stakeWallet,
    splitFee,
    authorizationInfo,
    peerAttrs,
    unboundOng,
    splitFeeAmountDisplay,
    unboundOngDisplay,
    signVisible,
    tx,
    handleRouteBack,
    newStakeAuthorization,
    switchWallet,
    handleRefresh,
    handleCancel,
    handleTxSent,
    redeemRewards,
    cancelAuthorization,
    redeemOnt,
    initializeAuthorizationManagementPage,
    disposeAuthorizationManagementPage,
    openNewAuthorizationPage,
    openAuthorizationWalletSwitch,
    triggerRefresh,
    closeSignDialog,
    handleTransactionSent,
    redeemSplitFeeRewards,
    redeemClaimableOnt,
    redeemPeerUnboundOng,
  }
}
