import type { Ref } from 'vue'
import { verifyPositiveInt } from '../../shared/lib/validators'
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
} from '../../modules/governance/application/nodeStake/nodeStakeManagementApplicationService'
import { notifyError } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { resolveWalletOrNotify, stageSignableTx } from './governanceTxHelpers'
import { WalletAdapterFactory } from '../../modules/wallet/application/adapter/WalletAdapterFactory'
import { notifyGovernanceSigningFailure } from './governanceSigningFeedback'
import {
  isCommonWallet,
  type CommonWallet,
  type HardwareWallet,
  type Identity,
  type NetworkId,
} from '../../shared/lib/types'
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
  pauseLedgerMonitoring: () => Promise<void>
  startLedgerMonitoring: () => void
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
    pauseLedgerMonitoring,
    startLedgerMonitoring,
    resolveStakeWallet,
    resetSigningState,
    refreshStakeInfo,
    settingStore,
    loadingStore,
  } = deps

  async function handleWalletSignOK() {
    const delegateMode = isDelegateSendTx.value

    refundClicked.value = true
    const wallet = resolveStakeWallet()
    if (!wallet || !stakeIdentity.value) {
      refundClicked.value = false
      return
    }

    const usingLedger = !isCommonWallet(wallet)
    let ledgerMonitoringPaused = false
    loadingStore.showLoadingModals()

    try {
      if (usingLedger) {
        await pauseLedgerMonitoring()
        ledgerMonitoringPaused = true
      }
      const adapter = WalletAdapterFactory.fromWalletSigner(wallet)
      if (!adapter) {
        notifyError('nodeStake.selectIndividualWallet')
        return
      }
      const result = await submitSignedNodeStakeManagementTransaction({
        tx: tx.value,
        adapter,
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
      if (ledgerMonitoringPaused) {
        startLedgerMonitoring()
      }
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
    const wallet = resolveWalletOrNotify(resolveStakeWallet)
    if (!wallet) return

    const result = await createNodeRecallTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
    })
    stageSignableTx(result, { tx, walletPassModal })
    return result
  }

  async function handleRefund() {
    const wallet = resolveWalletOrNotify(resolveStakeWallet)
    if (!wallet) return

    const result = await createNodeRefundTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
      claimableAmount: authorizationInfo.value.claimableVal,
    })
    stageSignableTx(result, { tx, walletPassModal })
    return result
  }

  async function handleQuitNode() {
    const wallet = resolveWalletOrNotify(resolveStakeWallet)
    if (!wallet) return

    const result = await createQuitNodeManagementTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
      claimableAmount: authorizationInfo.value.claimableVal,
    })
    if (stageSignableTx(result, { tx, walletPassModal })) {
      isQuit.value = true
    }
    return result
  }

  function validateAddPos() {
    validAddPos.value = Boolean(addPos.value && verifyPositiveInt(addPos.value))
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
      notifyFailure(result)
    }
    return result.ok
  }

  async function handleAddPosOk() {
    const wallet = resolveWalletOrNotify(resolveStakeWallet)
    if (!wallet) return

    if (!validateAddPos()) {
      notifyError('nodeMgmt.invalidInput')
      return
    }

    const result = await createAddInitPosManagementTransaction({
      nodePublicKey: nodePublicKey.value,
      stakeWalletAddress: wallet.address,
      amount: addPos.value,
    })
    if (stageSignableTx(result, { tx, walletPassModal })) {
      addPosVisible.value = false
      isDelegateSendTx.value = false
    }
    return result
  }

  async function handleReducePosOk() {
    const wallet = resolveWalletOrNotify(resolveStakeWallet)
    if (!wallet) return

    if (!validateReducePos()) {
      return
    }

    const result = await createReduceInitPosManagementTransaction({
      nodePublicKey: nodePublicKey.value,
      stakeWalletAddress: wallet.address,
      amount: reducePos.value,
    })
    if (stageSignableTx(result, { tx, walletPassModal })) {
      reducePosVisible.value = false
      isDelegateSendTx.value = false
    }
    return result
  }

  async function handleRedeemPosOk() {
    const wallet = resolveWalletOrNotify(resolveStakeWallet)
    if (!wallet) return

    const result = await createRedeemInitPosManagementTransaction({
      stakeWalletAddress: wallet.address,
      nodePublicKey: nodePublicKey.value,
      claimableAmount: authorizationInfo.value.claimableVal,
    })
    if (stageSignableTx(result, { tx, walletPassModal })) {
      redeemPosVisible.value = false
      isDelegateSendTx.value = false
    }
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
