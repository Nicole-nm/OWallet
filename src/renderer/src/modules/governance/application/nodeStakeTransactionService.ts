import {
  createAddInitPosTransaction,
  createChangeAuthorizationTransaction,
  createQuitNodeTransaction,
  createReduceInitPosTransaction,
  createSetFeePercentageTransaction,
  createUnregisterCandidateTransaction,
  createWithdrawAuthorizationTransaction,
} from '../../../domains/governance/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCreateTransaction } from '../../../shared/lib/transactionHelper'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import { normalizeNodePublicKey } from '../domain/nodeMapper'
import type { TransactionDraftResult } from '../../../shared/types'

const logger = createLogger('nodeStakeTransactionService')

export function createNodeRecallTransaction({
  stakeWalletAddress,
  nodePublicKey,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
}): Promise<TransactionDraftResult<SdkTransactionLike, { error: unknown }>> {
  return tryCreateTransaction({
    action: () =>
      createUnregisterCandidateTransaction({
        stakeWalletAddress,
        nodePublicKey,
      }),
    errorContext: 'createNodeRecallTransaction',
    logger,
  })
}

export async function createNodeRefundTransaction({
  stakeWalletAddress,
  nodePublicKey,
  claimableAmount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  claimableAmount?: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if ((claimableAmount || 0) === 0) {
    return {
      ok: false,
      level: 'warning',
      errorKey: 'nodeMgmt.noClaimbleToRefund',
    }
  }

  return tryCreateTransaction({
    action: () =>
      createWithdrawAuthorizationTransaction({
        stakeWalletAddress,
        nodePublicKey,
        amount: claimableAmount as number,
      }),
    errorContext: 'createNodeRefundTransaction',
    logger,
  })
}

export async function createQuitNodeManagementTransaction({
  stakeWalletAddress,
  nodePublicKey,
  claimableAmount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  claimableAmount?: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if ((claimableAmount || 0) > 0) {
    return {
      ok: false,
      level: 'warning',
      errorKey: 'nodeMgmt.hasClaimableInitPos',
    }
  }

  return tryCreateTransaction({
    action: () => createQuitNodeTransaction({ stakeWalletAddress, nodePublicKey }),
    errorContext: 'createQuitNodeManagementTransaction',
    logger,
  })
}

export function createAddInitPosManagementTransaction({
  stakeWalletAddress,
  nodePublicKey,
  amount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  amount: string | number
}): Promise<TransactionDraftResult<SdkTransactionLike, { error: unknown }>> {
  return tryCreateTransaction({
    action: () =>
      createAddInitPosTransaction({
        nodePublicKey,
        stakeWalletAddress,
        amount: parseInt(String(amount), 10),
      }),
    errorContext: 'createAddInitPosManagementTransaction',
    logger,
  })
}

export function createReduceInitPosManagementTransaction({
  stakeWalletAddress,
  nodePublicKey,
  amount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  amount: string | number
}): Promise<TransactionDraftResult<SdkTransactionLike, { error: unknown }>> {
  return tryCreateTransaction({
    action: () =>
      createReduceInitPosTransaction({
        nodePublicKey,
        stakeWalletAddress,
        amount: parseInt(String(amount), 10),
      }),
    errorContext: 'createReduceInitPosManagementTransaction',
    logger,
  })
}

export async function createRedeemInitPosManagementTransaction({
  stakeWalletAddress,
  nodePublicKey,
  claimableAmount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  claimableAmount?: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if ((claimableAmount || 0) === 0) {
    return {
      ok: false,
      level: 'warning',
      errorKey: 'nodeMgmt.noClaimbleInitPos',
    }
  }

  return tryCreateTransaction({
    action: () =>
      createWithdrawAuthorizationTransaction({
        stakeWalletAddress,
        nodePublicKey,
        amount: claimableAmount as number,
      }),
    errorContext: 'createRedeemInitPosManagementTransaction',
    logger,
  })
}

export async function createChangeStakeAuthorizationTransaction({
  stakeDetail,
  stakeWalletAddress,
  unit,
  unitVal,
  currentMaxAuthorize,
}: {
  stakeDetail?: unknown
  stakeWalletAddress: string
  unit: string | number
  unitVal: number
  currentMaxAuthorize: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  const nodePublicKey = normalizeNodePublicKey(stakeDetail)

  if (!nodePublicKey) {
    return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
  }

  const maxAuthorize = parseInt(String(unit), 10) * unitVal

  if (maxAuthorize === currentMaxAuthorize) {
    return { ok: false, level: 'warning', errorKey: 'nodeMgmt.noChange' }
  }

  return tryCreateTransaction({
    action: () =>
      createChangeAuthorizationTransaction({
        nodePublicKey,
        stakeWalletAddress,
        maxAuthorize,
      }),
    errorContext: 'createChangeStakeAuthorizationTransaction',
    logger,
  })
}

export async function createChangeStakeCostTransaction({
  stakeDetail,
  stakeWalletAddress,
  peerCost,
  stakeCost,
}: {
  stakeDetail?: unknown
  stakeWalletAddress: string
  peerCost: string | number
  stakeCost: string | number
}): Promise<TransactionDraftResult<SdkTransactionLike, { error?: unknown }>> {
  const nodePublicKey = normalizeNodePublicKey(stakeDetail)

  if (!nodePublicKey) {
    return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
  }

  return tryCreateTransaction({
    action: () =>
      createSetFeePercentageTransaction({
        nodePublicKey,
        stakeWalletAddress,
        peerCost: parseInt(String(peerCost), 10),
        stakeCost: parseInt(String(stakeCost), 10),
      }),
    errorContext: 'createChangeStakeCostTransaction',
    logger,
  })
}
