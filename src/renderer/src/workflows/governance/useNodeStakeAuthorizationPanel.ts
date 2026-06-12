import { computed, ref } from 'vue'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import {
  createChangeStakeAuthorizationTransaction,
  createChangeStakeCostTransaction,
  createStakeRewardsRedeemTransaction,
  createStakeUnboundOngRedeemTransaction,
  refreshNodeStakeAuthorizationDetails,
  validateStakeAuthorizationUnit,
} from '../../modules/governance/application/nodeStake/nodeStakeManagementApplicationService'
import type { GovernanceSignablePayload } from '../../modules/governance/application/common/governanceSignablePayload'

function applyNodeStakeAuthorizationDetails(
  nodeAuthStore: unknown,
  result: Record<string, unknown>
) {
  const store = nodeAuthStore as {
    setCurrentPeer(payload: { peer: unknown }): void
    setPeerAttributes(payload: { peerAttributes: unknown }): void
    setSplitFee(payload: { splitFee: unknown }): void
    setPosLimit(payload: { posLimit: unknown }): void
    setPeerUnboundOng(payload: { peerUnboundOng: unknown }): void
  }
  store.setCurrentPeer({ peer: result.currentPeer })
  store.setPeerAttributes({ peerAttributes: result.peerAttributes })
  store.setSplitFee({ splitFee: result.splitFee })
  store.setPosLimit({ posLimit: result.posLimit })
  store.setPeerUnboundOng({ peerUnboundOng: result.peerUnboundOng })
}

export function useNodeStakeAuthorizationPanel() {
  const nodeAuthStore = useNodeAuthorizationStore()
  const nodeStakeStore = useNodeStakeStore()

  const peerCost = ref(Number(nodeAuthStore.peerAttributes.tPeerCost || 0))
  const stakeCost = ref(Number(nodeAuthStore.peerAttributes.tStakeCost || 0))
  const validUnit = ref(true)
  const unit = ref(Number(nodeAuthStore.peerAttributes.maxAuthorize || 0))
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')
  const showEditProportion = ref(false)
  const allowedStakeInitialized = ref(false)

  const currentPeer = computed(() => nodeAuthStore.currentPeer)
  const peerAttributes = computed(() => nodeAuthStore.peerAttributes)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const stakeDetail = computed(() => nodeStakeStore.detail)
  const splitFee = computed(() => nodeAuthStore.splitFee)
  const posLimit = computed(() => nodeAuthStore.posLimit)
  const peerUnboundOng = computed(() => nodeAuthStore.peerUnboundOng)
  const maxStakeLimit = computed(() => {
    const initPos = nodeAuthStore.currentPeer.initPos
    return formatNumberForDisplay(posLimit.value * initPos)
  })
  const initPosStr = computed(() => currentPeer.value.initPosStr)
  const initPosDisplay = computed(() => formatNumberForDisplay(currentPeer.value.initPosStr))
  const totalPosDisplay = computed(() => formatNumberForDisplay(currentPeer.value.totalPosStr))
  const maxAuthorizeDisplay = computed(() =>
    formatNumberForDisplay(peerAttributes.value.maxAuthorizeStr)
  )
  const splitFeeAmountDisplay = computed(() => formatNumberForDisplay(splitFee.value.amount))
  const peerUnboundOngDisplay = computed(() => formatNumberForDisplay(peerUnboundOng.value))
  usePollingTask(refresh, { intervalMs: 10000 })

  function resolveStakeWallet() {
    const wallet = stakeWallet.value
    return wallet?.address ? wallet : null
  }

  function syncAllowedStakeInput() {
    unit.value = Number(peerAttributes.value?.maxAuthorize || 0)
    validUnit.value = true
  }

  function syncRewardProportionInputs() {
    peerCost.value = Number(peerAttributes.value?.tPeerCost || 0)
    stakeCost.value = Number(peerAttributes.value?.tStakeCost || 0)
  }

  async function refresh({ syncInputs = false }: { syncInputs?: boolean } = {}) {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    const result = await refreshNodeStakeAuthorizationDetails({
      stakeDetail: stakeDetail.value,
      stakeWalletAddress: wallet.address,
    })

    if (result.ok) {
      applyNodeStakeAuthorizationDetails(nodeAuthStore, result)
      if (!allowedStakeInitialized.value || syncInputs) {
        syncAllowedStakeInput()
        allowedStakeInitialized.value = true
      }
    }

    return result
  }

  function editProportion() {
    syncRewardProportionInputs()
    showEditProportion.value = true
  }

  function handleCancelChangeCost() {
    showEditProportion.value = false
  }

  async function confirmChangeAuthorization() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const validation = validateStakeAuthorizationUnit({
      unit: unit.value,
      currentPeer: currentPeer.value,
      posLimit: posLimit.value,
    })
    if (!validation.ok) {
      if (validation.errorKey === 'nodeMgmt.invalidInput') {
        notifyError(validation.errorKey)
      } else {
        notifyError(validation.errorKey || 'common.networkErr')
      }
      return
    }

    const result = await createChangeStakeAuthorizationTransaction({
      stakeDetail: stakeDetail.value,
      stakeWalletAddress: wallet.address,
      unit: unit.value,
      currentMaxAuthorize: peerAttributes.value.maxAuthorize,
    })
    if (notifyFailure(result)) return

    tx.value = result.tx
    signVisible.value = true
  }

  async function confirmChangeCost() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createChangeStakeCostTransaction({
      stakeDetail: stakeDetail.value,
      stakeWalletAddress: wallet.address,
      peerCost: peerCost.value,
      stakeCost: stakeCost.value,
    })
    if (notifyFailure(result)) return

    tx.value = result.tx
    signVisible.value = true
    showEditProportion.value = false
    peerCost.value = 0
    stakeCost.value = 0
  }

  function validateUnit() {
    const result = validateStakeAuthorizationUnit({
      unit: unit.value,
      currentPeer: currentPeer.value,
      posLimit: posLimit.value,
    })

    validUnit.value = result.ok
    if (!result.ok && result.errorKey !== 'nodeMgmt.invalidInput') {
      notifyFailure(result, 'common.networkErr')
    }
  }

  function handleCancel() {
    signVisible.value = false
    tx.value = ''
  }

  function handleTxSent() {
    signVisible.value = false
    tx.value = ''
    void refresh({ syncInputs: true })
  }

  async function redeemRewards() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createStakeRewardsRedeemTransaction({
      stakeWalletAddress: wallet.address,
      amount: Number(splitFee.value.amount),
    })
    if (!result.ok) {
      notifyWarning(result.errorKey)
      return
    }

    tx.value = result.tx
    signVisible.value = true
  }

  async function redeemPeerUnboundOng() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createStakeUnboundOngRedeemTransaction({
      stakeWalletAddress: wallet.address,
      amount: peerUnboundOng.value,
    })
    if (!result.ok) {
      notifyWarning(result.errorKey)
      return
    }

    tx.value = result.tx
    signVisible.value = true
  }

  return {
    currentPeer,
    peerAttributes,
    stakeWallet,
    stakeDetail,
    splitFee,
    posLimit,
    peerUnboundOng,
    maxStakeLimit,
    initPosStr,
    initPosDisplay,
    totalPosDisplay,
    maxAuthorizeDisplay,
    splitFeeAmountDisplay,
    peerUnboundOngDisplay,
    peerCost,
    stakeCost,
    validUnit,
    unit,
    signVisible,
    tx,
    showEditProportion,
    editProportion,
    handleCancelChangeCost,
    confirmChangeAuthorization,
    confirmChangeCost,
    validateUnit,
    handleCancel,
    handleTxSent,
    refresh,
    redeemRewards,
    redeemPeerUnboundOng,
  }
}
