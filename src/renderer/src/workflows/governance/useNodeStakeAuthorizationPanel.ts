import { computed, ref } from 'vue'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import {
  createChangeStakeAuthorizationTransaction,
  createChangeStakeCostTransaction,
  createStakeRewardsRedeemTransaction,
  createStakeUnboundOngRedeemTransaction,
  refreshNodeStakeAuthorizationDetails,
  validateStakeAuthorizationUnit,
} from '../../modules/governance/application/nodeStakeManagementApplicationService'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

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

  const peerCost = ref(0)
  const stakeCost = ref(0)
  const validUnit = ref(true)
  const unit = ref(0)
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')
  const showEditProportion = ref(false)
  const unitVal = ref(1)

  const currentPeer = computed(() => nodeAuthStore.currentPeer)
  const peerAttributes = computed(() => nodeAuthStore.peerAttributes)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const stakeDetail = computed(() => nodeStakeStore.detail)
  const splitFee = computed(() => nodeAuthStore.splitFee)
  const posLimit = computed(() => nodeAuthStore.posLimit)
  const peerUnboundOng = computed(() => nodeAuthStore.peerUnboundOng)
  const maxStakeLimit = computed(() => {
    const initPos = nodeAuthStore.currentPeer.initPos
    return Number(posLimit.value * initPos).toLocaleString('en-US')
  })
  const initPosStr = computed(() => currentPeer.value.initPosStr)
  usePollingTask(refresh, { intervalMs: 10000 })

  function resolveStakeWallet() {
    const wallet = stakeWallet.value
    return wallet?.address ? wallet : null
  }

  async function refresh() {
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
    }

    return result
  }

  function editProportion() {
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
      unitVal: unitVal.value,
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
      unitVal: unitVal.value,
      currentMaxAuthorize: peerAttributes.value.maxAuthorize,
    })
    if (!result.ok) {
      if (result.level === 'warning') {
        notifyWarning(result.errorKey)
      } else {
        notifyError(result.errorKey)
      }
      return
    }

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
    if (!result.ok) {
      notifyError(result.errorKey)
      return
    }

    tx.value = result.tx
    signVisible.value = true
    showEditProportion.value = false
    peerCost.value = 0
    stakeCost.value = 0
  }

  function validateUnit() {
    const result = validateStakeAuthorizationUnit({
      unit: unit.value,
      unitVal: unitVal.value,
      currentPeer: currentPeer.value,
      posLimit: posLimit.value,
    })

    validUnit.value = result.ok
    if (!result.ok && result.errorKey !== 'nodeMgmt.invalidInput') {
      notifyError(result.errorKey || 'common.networkErr')
    }
  }

  function handleCancel() {
    signVisible.value = false
    tx.value = ''
    unit.value = 0
  }

  function handleTxSent() {
    signVisible.value = false
    tx.value = ''
    unit.value = 0
    refresh()
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
    peerCost,
    stakeCost,
    validUnit,
    unit,
    signVisible,
    tx,
    showEditProportion,
    unitVal,
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
