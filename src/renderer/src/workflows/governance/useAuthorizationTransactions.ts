import type { Ref } from 'vue'
import {
  createAuthorizationClaimableOntRedeemTransaction,
  createAuthorizationRewardsRedeemTransaction,
  createAuthorizationUnboundOngRedeemTransaction,
} from '../../modules/governance/application/authorization/authorizationManagementApplicationService'
import type { WalletSigner } from '../../shared/lib/types'
import type { AuthorizationInfo, GovernanceNode, SplitFee } from '../../shared/types'
import type { GovernanceSignablePayload } from '../../modules/governance/application/common/governanceSignablePayload'

interface AuthorizationTransactionsDeps {
  signVisible: Ref<boolean>
  tx: Ref<GovernanceSignablePayload>
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
    currentNode,
    authorizationInfo,
    splitFee,
    unboundOng,
    resolveStakeWallet,
  } = deps

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
    redeemSplitFeeRewards,
    redeemClaimableOnt,
    redeemPeerUnboundOng,
  }
}
