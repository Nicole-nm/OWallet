import type { Ref } from 'vue'
import { varifyPositiveInt } from '../../shared/lib/validators'
import { handleTransactionFeedback } from '../../shared/lib/transactionFeedback'
import {
  createAddInitPosManagementTransaction,
  createNodeRecallTransaction,
  createNodeRefundTransaction,
  createQuitNodeManagementTransaction,
  createRedeemInitPosManagementTransaction,
  createReduceInitPosManagementTransaction,
  submitSignedNodeStakeManagementTransaction,
  validateReduceInitPosAmount,
} from '../../modules/governance/application/nodeStakeManagementApplicationService'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { notifyGovernanceSigningFailure } from './governanceSigningFeedback'
import type { CommonWallet, HardwareWallet, Identity, NetworkId } from '../../shared/lib/types'
import type {
  AuthorizationInfo,
  AuthorizationPeer,
  LedgerWalletSelection,
  StakeDetail,
} from '../../shared/types'

interface NodeStakeTransactionsDeps {
  // Dialog state refs (shared with useNodeStakeDialogs)
  tx: Ref<unknown>
  walletPassModal: Ref<boolean>
  walletPassword: Ref<string>
  isDelegateSendTx: Ref<boolean>
  isQuit: Ref<boolean>
  addPosVisible: Ref<boolean>
  reducePosVisible: Ref<boolean>
  redeemPosVisible: Ref<boolean>
  refundClicked: Ref<boolean>
  // Input value refs
  addPos: Ref<number>
  validAddPos: Ref<boolean>
  reducePos: Ref<number>
  validReducePos: Ref<boolean>
  // Computed getters
  nodePublicKey: Ref<string>
  currentPeer: Ref<AuthorizationPeer>
  detail: Ref<StakeDetail>
  posLimit: Ref<number>
  authorizationInfo: Ref<AuthorizationInfo>
  stakeIdentity: Ref<Identity>
  ledgerWallet: Ref<LedgerWalletSelection>
  // Callbacks
  resolveStakeWallet: () => CommonWallet | HardwareWallet | null
  resetSigningState: () => void
  refreshStakeInfo: () => Promise<unknown>
  // Stores
  settingStore: { network: NetworkId }
  loadingStore: {
    showLoadingModals: () => void
    hideLoadingModals: () => void
  }
}

export function useNodeStakeTransactions(deps: NodeStakeTransactionsDeps) {
  const {
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
    refreshStakeInfo,
    settingStore,
    loadingStore,
  } = deps

  async function handleWalletSignOK() {
    const delegateMode = isDelegateSendTx.value

    refundClicked.value = true
    loadingStore.showLoadingModals()

    const wallet = resolveStakeWallet()
    if (!wallet || !stakeIdentity.value) {
      return
    }

    try {
      const result = await submitSignedNodeStakeManagementTransaction({
        tx: tx.value,
        wallet,
        password: walletPassword.value,
        network: settingStore.network,
        ontid: stakeIdentity.value.ontid,
        nodePublicKey: nodePublicKey.value,
        stakeWalletAddress: wallet.address,
        delegate: delegateMode,
        ledgerConnected: Boolean(ledgerWallet.value?.address),
      })

      if (!result.ok) {
        if (result.cancelled) {
          return result
        }

        notifyGovernanceSigningFailure(result)
        return result
      }

      if ('delegated' in result && result.delegated) {
        resetSigningState()
        void refreshStakeInfo()
        return result
      }

      const feedback = handleTransactionFeedback(result, {
        prependErrorPrefix: false,
      })
      if (feedback.ok) {
        resetSigningState()
      }
      return feedback
    } finally {
      loadingStore.hideLoadingModals()
      if (delegateMode) {
        setTimeout(() => {
          refundClicked.value = false
        }, 5000)
      } else {
        refundClicked.value = false
      }
    }
  }

  async function handleRecall() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createNodeRecallTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
    })
    if (!result.ok) {
      notifyError(result.errorKey)
      return result
    }

    tx.value = result.tx
    walletPassModal.value = true
    return result
  }

  async function handleRefund() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createNodeRefundTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
      claimableAmount: authorizationInfo.value.claimableVal,
    })
    if (!result.ok) {
      if (result.level === 'warning') {
        notifyWarning(result.errorKey)
      } else {
        notifyError(result.errorKey)
      }
      return result
    }

    tx.value = result.tx
    walletPassModal.value = true
    return result
  }

  async function handleQuitNode() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createQuitNodeManagementTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
      claimableAmount: authorizationInfo.value.claimableVal,
    })
    if (!result.ok) {
      if (result.level === 'warning') {
        notifyWarning(result.errorKey)
      } else {
        notifyError(result.errorKey)
      }
      return result
    }

    tx.value = result.tx
    isQuit.value = true
    walletPassModal.value = true
    return result
  }

  function validateAddPos() {
    validAddPos.value = Boolean(addPos.value && varifyPositiveInt(addPos.value))
    return validAddPos.value
  }

  function validateReducePos() {
    const result = validateReduceInitPosAmount({
      amount: reducePos.value,
      currentPeer: currentPeer.value,
      detail: detail.value,
      posLimit: posLimit.value,
    })

    validReducePos.value = result.ok
    if (!result.ok && result.errorKey !== 'nodeMgmt.invalidInput') {
      notifyError(result.errorKey)
    }
    return result.ok
  }

  async function handleAddPosOk() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    if (!validateAddPos()) {
      notifyError('nodeMgmt.invalidInput')
      return
    }

    const result = await createAddInitPosManagementTransaction({
      nodePublicKey: nodePublicKey.value,
      stakeWalletAddress: wallet.address,
      amount: addPos.value,
    })
    if (!result.ok) {
      notifyError(result.errorKey)
      return result
    }

    addPosVisible.value = false
    tx.value = result.tx
    walletPassModal.value = true
    isDelegateSendTx.value = false
    return result
  }

  async function handleReducePosOk() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    if (!validateReducePos()) {
      return
    }

    const result = await createReduceInitPosManagementTransaction({
      nodePublicKey: nodePublicKey.value,
      stakeWalletAddress: wallet.address,
      amount: reducePos.value,
    })
    if (!result.ok) {
      notifyError(result.errorKey)
      return result
    }

    reducePosVisible.value = false
    tx.value = result.tx
    walletPassModal.value = true
    isDelegateSendTx.value = false
    return result
  }

  async function handleRedeemPosOk() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    const result = await createRedeemInitPosManagementTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
      claimableAmount: authorizationInfo.value.claimableVal,
    })
    if (!result.ok) {
      if (result.level === 'warning') {
        notifyWarning(result.errorKey)
      } else {
        notifyError(result.errorKey)
      }
      return result
    }

    redeemPosVisible.value = false
    tx.value = result.tx
    walletPassModal.value = true
    isDelegateSendTx.value = false
    return result
  }

  return {
    handleWalletSignOK,
    handleRecall,
    handleRefund,
    handleQuitNode,
    validateAddPos,
    validateReducePos,
    handleAddPosOk,
    handleReducePosOk,
    handleRedeemPosOk,
  }
}
