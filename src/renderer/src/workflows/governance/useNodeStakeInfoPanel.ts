import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { ROUTE_NAMES } from '../../router/routes'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { isCommonWallet, type CommonWallet, type HardwareWallet } from '../../shared/lib/types'
import { refreshNodeStakeManagementDetails } from '../../modules/governance/application/nodeStakeManagementApplicationService'
import { useNodeStakeDialogs } from './useNodeStakeDialogs'
import { useNodeStakeTransactions } from './useNodeStakeTransactions'

interface NodeStakeStatusRefs {
  statusStep1: { value: string }
  statusStep2: { value: string }
  statusStep3: { value: string }
  currentStep: { value: number }
  statusTip: { value: string }
}

function applyNodeStakeManagementDetails({
  nodeStakeStore,
  nodeAuthStore,
  result,
}: Record<string, unknown>) {
  const stakeStore = nodeStakeStore as {
    setStakeDetail(payload: { detail: unknown }): void
  }
  const authStore = nodeAuthStore as {
    setCurrentPeer(payload: { peer: unknown }): void
    setPosLimit(payload: { posLimit: unknown }): void
    setAuthorizationInfo(payload: { authorizationInfo: unknown }): void
  }
  const details = result as Record<string, unknown>
  stakeStore.setStakeDetail({ detail: details.detail })
  authStore.setCurrentPeer({ peer: details.currentPeer })
  authStore.setPosLimit({ posLimit: details.posLimit })
  authStore.setAuthorizationInfo({ authorizationInfo: details.authorizationInfo })
}

function applyStakeStatus(state: NodeStakeStatusRefs, stakeStatus: Record<string, unknown> = {}) {
  state.statusStep1.value = String(stakeStatus.status1 || '')
  state.statusStep2.value = String(stakeStatus.status2 || '')
  state.statusStep3.value = String(stakeStatus.status3 || '')
  state.currentStep.value = Number(stakeStatus.current ?? 0)
  state.statusTip.value = String(stakeStatus.statusTip || '')
}

export function useNodeStakeInfoPanel() {
  const router = useRouter()
  const settingStore = useSettingStore()
  const nodeStakeStore = useNodeStakeStore()
  const nodeAuthStore = useNodeAuthorizationStore()
  const loadingStore = useLoadingModalStore()

  const refundClicked = ref(false)
  const addPos = ref(0)
  const validAddPos = ref(true)
  const reducePos = ref(0)
  const validReducePos = ref(true)
  const statusStep1 = ref('')
  const statusStep2 = ref('')
  const statusStep3 = ref('')
  const currentStep = ref(0)
  const statusTip = ref('')

  const stakeIdentity = computed(() => nodeStakeStore.stakeIdentity)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const nodePublicKey = computed(() => nodeStakeStore.nodePublicKey)
  const { ledgerStatus, ledgerPk, ledgerWallet } = useLedgerStatusMonitor({
    shouldPoll: computed(() => Boolean(stakeWallet.value && !isCommonWallet(stakeWallet.value))),
  })
  const detail = computed(() => nodeStakeStore.detail)
  const currentPeer = computed(() => nodeAuthStore.currentPeer)
  const posLimit = computed(() => nodeAuthStore.posLimit)
  const authorizationInfo = computed(() => nodeAuthStore.authorizationInfo)

  const dialogs = useNodeStakeDialogs()
  const {
    walletPassModal,
    walletPassword,
    tx,
    isDelegateSendTx,
    isQuit,
    addPosVisible,
    reducePosVisible,
    redeemPosVisible,
    resetSigningState,
    handleAddPosCancel,
    handleReducePosCancel,
    handleRedeemPosCancel,
  } = dialogs

  function resolveStakeWallet() {
    const wallet = stakeWallet.value
    return wallet?.address ? (wallet as CommonWallet | HardwareWallet) : null
  }

  // Forward reference: refreshStakeInfo is defined below but passed here via wrapper
  // so that useNodeStakeTransactions can call it without a circular init dependency.
  function refreshStakeInfoProxy() {
    return refreshStakeInfo()
  }

  const { intervalId, startPolling } = usePollingTask(refreshStakeInfo, {
    autoStart: false,
    intervalMs: 10000,
  })

  const transactions = useNodeStakeTransactions({
    tx,
    walletPassModal,
    walletPassword,
    isDelegateSendTx,
    isQuit,
    addPosVisible,
    reducePosVisible,
    redeemPosVisible,
    refundClicked,
    addPos,
    validAddPos,
    reducePos,
    validReducePos,
    nodePublicKey,
    currentPeer,
    detail,
    posLimit,
    authorizationInfo,
    stakeIdentity,
    ledgerWallet,
    resolveStakeWallet,
    resetSigningState,
    refreshStakeInfo: refreshStakeInfoProxy,
    settingStore,
    loadingStore,
  })

  const {
    handleWalletSignOK,
    handleRecall,
    handleRefund,
    handleQuitNode,
    validateAddPos,
    validateReducePos,
    handleAddPosOk,
    handleReducePosOk,
    handleRedeemPosOk,
  } = transactions

  onMounted(() => {
    startPolling()
  })

  function handleRouteBack() {
    router.go(-1)
  }

  function handleBack() {
    router.go(-1)
  }

  function handleWalletSignCancel() {
    resetSigningState()
  }

  function handleNewStake() {
    router.push({ name: ROUTE_NAMES.NODE_APPLY })
  }

  function handleAddInitPos() {
    addPosVisible.value = true
  }

  function handleReduceInitPos() {
    reducePosVisible.value = true
  }

  function openRedeemPosModal() {
    redeemPosVisible.value = true
  }

  async function refreshStakeInfo() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    const result = await refreshNodeStakeManagementDetails({
      network: settingStore.network,
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
    })

    if (result.ok) {
      applyNodeStakeManagementDetails({
        nodeStakeStore,
        nodeAuthStore,
        result,
      })
      applyStakeStatus(
        {
          statusStep1,
          statusStep2,
          statusStep3,
          currentStep,
          statusTip,
        },
        result.stakeStatus
      )
    }

    return result
  }

  return {
    intervalId,
    refundClicked,
    walletPassModal,
    walletPassword,
    tx,
    addPosVisible,
    addPos,
    validAddPos,
    reducePosVisible,
    reducePos,
    validReducePos,
    isDelegateSendTx,
    redeemPosVisible,
    isQuit,
    stakeIdentity,
    stakeWallet,
    nodePublicKey,
    ledgerStatus,
    ledgerPk,
    ledgerWallet,
    detail,
    currentPeer,
    posLimit,
    statusStep1,
    statusStep2,
    statusStep3,
    currentStep,
    statusTip,
    authorizationInfo,
    handleRouteBack,
    handleBack,
    handleWalletSignCancel,
    handleWalletSignOK,
    handleRecall,
    handleRefund,
    handleQuitNode,
    handleNewStake,
    handleAddInitPos,
    handleReduceInitPos,
    validateAddPos,
    validateReducePos,
    handleAddPosOk,
    handleAddPosCancel,
    handleReducePosOk,
    handleReducePosCancel,
    openRedeemPosModal,
    handleRedeemPosOk,
    handleRedeemPosCancel,
  }
}
