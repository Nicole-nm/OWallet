import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { canOpenNewAuthorization } from '../../modules/governance/application/authorizationManagementApplicationService'
import { refreshAuthorizationOverview } from '../../modules/governance/application/authorizationQueryApplicationService'
import { ROUTE_NAMES } from '../../router/routes'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useAuthorizationTransactions } from './useAuthorizationTransactions'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

function applyAuthorizationOverview(nodeAuthStore: unknown, result: Record<string, unknown>) {
  const store = nodeAuthStore as {
    setAuthorizationInfo(payload: { authorizationInfo: unknown }): void
    setSplitFee(payload: { splitFee: unknown }): void
    setPeerAttributes(payload: { peerAttributes: unknown }): void
    setPeerUnboundOng(payload: { peerUnboundOng: unknown }): void
  }
  store.setAuthorizationInfo({ authorizationInfo: result.authorizationInfo })
  store.setSplitFee({ splitFee: result.splitFee })
  store.setPeerAttributes({ peerAttributes: result.peerAttributes })
  store.setPeerUnboundOng({ peerUnboundOng: result.peerUnboundOng })
}

export function useAuthorizationManagementPage() {
  const router = useRouter()
  const nodeAuthStore = useNodeAuthorizationStore()
  const loadingStore = useLoadingModalStore()
  const nodeStakeStore = useNodeStakeStore()

  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')
  const cancelVisible = ref(false)
  const cancelAmount = ref(0)
  const validCancelAmount = ref(true)

  const currentNode = computed(() => nodeAuthStore.currentNode)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const splitFee = computed(() => nodeAuthStore.splitFee)
  const authorizationInfo = computed(() => nodeAuthStore.authorizationInfo)
  const peerAttrs = computed(() => nodeAuthStore.peerAttributes)
  const unboundOng = computed(() => nodeAuthStore.peerUnboundOng)

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

  const {
    validateCancelUnits,
    submitCancelAuthorization,
    closeCancelAuthorizationDialog,
    openCancelAuthorizationDialog,
    redeemSplitFeeRewards,
    redeemClaimableOnt,
    redeemPeerUnboundOng,
  } = useAuthorizationTransactions({
    signVisible,
    tx,
    cancelVisible,
    cancelAmount,
    validCancelAmount,
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
    await refreshAuthorizationDetails({ showError: true })
    startPolling({ immediate: false })
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
    cancelAmount.value = 0
  }

  function handleTransactionSent() {
    signVisible.value = false
    cancelAmount.value = 0
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
    if (!result.ok) {
      notifyError(result.errorKey)
    }
    return result
  }

  function handleCancel() {
    closeSignDialog()
  }

  function handleTxSent() {
    handleTransactionSent()
  }

  function validateCancelAmount() {
    validateCancelUnits()
  }

  async function handleCancelAuthorizationOk() {
    const result = await submitCancelAuthorization()
    if (!result.ok) {
      notifyError(result.errorKey)
    }
    return result
  }

  function handleCancelAuthorizationCancel() {
    closeCancelAuthorizationDialog()
  }

  async function redeemRewards() {
    const result = await redeemSplitFeeRewards()
    if (!result.ok) {
      notifyWarning(result.errorKey)
    }
    return result
  }

  function cancelAuthorization() {
    openCancelAuthorizationDialog()
  }

  async function redeemOnt() {
    const result = await redeemClaimableOnt()
    if (!result.ok) {
      if ('level' in result && result.level === 'warning') {
        notifyWarning(result.errorKey)
      } else {
        notifyError(result.errorKey)
      }
    }
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
    signVisible,
    tx,
    cancelVisible,
    cancelAmount,
    validCancelAmount,
    handleRouteBack,
    newStakeAuthorization,
    switchWallet,
    handleRefresh,
    handleCancel,
    handleTxSent,
    validateCancelAmount,
    handleCancelAuthorizationOk,
    handleCancelAuthorizationCancel,
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
    validateCancelUnits,
    submitCancelAuthorization,
    closeCancelAuthorizationDialog,
    redeemSplitFeeRewards,
    openCancelAuthorizationDialog,
    redeemClaimableOnt,
    redeemPeerUnboundOng,
  }
}
