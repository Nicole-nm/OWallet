import type { Ref } from 'vue'
import {
  createAuthorizationClaimableOntRedeemTransaction,
  createAuthorizationRewardsRedeemTransaction,
  createAuthorizationUnboundOngRedeemTransaction,
  createCancelAuthorizationTransaction,
  validateCancelAuthorizationAmount,
} from '../../modules/governance/application/authorizationManagementApplicationService'
import type { WalletSigner } from '../../shared/lib/types'
import type { AuthorizationInfo, GovernanceNode, SplitFee } from '../../shared/types'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

interface AuthorizationTransactionsDeps {
  signVisible: Ref<boolean>
  tx: Ref<GovernanceSignablePayload>
  cancelVisible: Ref<boolean>
  cancelAmount: Ref<number>
  validCancelAmount: Ref<boolean>
  currentNode: Ref<GovernanceNode>
  authorizationInfo: Ref<AuthorizationInfo>
  splitFee: Ref<SplitFee>
  unboundOng: Ref<number>
  resolveStakeWallet: () => WalletSigner | null
}

export function useAuthorizationTransactions(deps: AuthorizationTransactionsDeps) {
  const {
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
  } = deps

  function validateCancelUnits() {
    const result = validateCancelAuthorizationAmount({
      cancelAmount: cancelAmount.value,
      authorizationInfo: authorizationInfo.value,
    })
    validCancelAmount.value = result.validCancelAmount
    return validCancelAmount.value
  }

  async function submitCancelAuthorization() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
      }
    }

    const result = await createCancelAuthorizationTransaction({
      currentNode: currentNode.value,
      stakeWalletAddress: wallet.address,
      cancelAmount: cancelAmount.value,
      authorizationInfo: authorizationInfo.value,
    })
    if (!result.ok) {
      validCancelAmount.value = false
      return result
    }

    cancelVisible.value = false
    signVisible.value = true
    tx.value = result.tx
    cancelAmount.value = 0
    validCancelAmount.value = true
    return { ok: true as const }
  }

  function closeCancelAuthorizationDialog() {
    cancelVisible.value = false
  }

  function openCancelAuthorizationDialog() {
    cancelVisible.value = true
    tx.value = ''
  }

  async function redeemSplitFeeRewards() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
      }
    }

    const result = await createAuthorizationRewardsRedeemTransaction({
      stakeWalletAddress: wallet.address,
      amount: Number(splitFee.value.amount) || 0,
    })
    if (!result.ok) {
      return result
    }

    signVisible.value = true
    tx.value = result.tx
    return { ok: true as const }
  }

  async function redeemClaimableOnt() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
      }
    }

    const result = await createAuthorizationClaimableOntRedeemTransaction({
      currentNode: currentNode.value,
      stakeWalletAddress: wallet.address,
      authorizationInfo: authorizationInfo.value,
    })
    if (!result.ok) {
      return result
    }

    signVisible.value = true
    tx.value = result.tx
    return { ok: true as const }
  }

  async function redeemPeerUnboundOng() {
    const wallet = resolveStakeWallet()
    if (!wallet) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
      }
    }

    const result = await createAuthorizationUnboundOngRedeemTransaction({
      stakeWalletAddress: wallet.address,
      amount: unboundOng.value,
    })
    if (!result.ok) {
      return result
    }

    signVisible.value = true
    tx.value = result.tx
    return { ok: true as const }
  }

  return {
    validateCancelUnits,
    submitCancelAuthorization,
    closeCancelAuthorizationDialog,
    openCancelAuthorizationDialog,
    redeemSplitFeeRewards,
    redeemClaimableOnt,
    redeemPeerUnboundOng,
  }
}
