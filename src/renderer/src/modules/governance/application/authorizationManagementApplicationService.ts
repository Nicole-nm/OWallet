import {
  createAuthorizationTransaction,
  createUnauthorizationTransaction,
  createWithdrawAuthorizationTransaction,
  createWithdrawFeeTransaction,
  createWithdrawPeerUnboundOngTransaction,
} from '../../../domains/governance/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCreateTransaction } from '../../../shared/lib/transactionHelper'
import { varifyPositiveInt } from '../../../shared/lib/validators'
import { normalizeNodePublicKey } from '../domain/nodeMapper'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import type {
  AuthorizationInfo,
  GovernanceNode,
  PeerAttributes,
  ServiceResult,
  TransactionDraftResult,
} from '../../../shared/types'

const logger = createLogger('authorizationManagementApplicationService')

type AuthorizationInputResult =
  | { ok: true; validInput: true; amount: number }
  | { ok: false; validInput: false; amount: number; errorKey: string }

type CancelAuthorizationAmountResult =
  | { ok: true; validCancelAmount: true; amount: number }
  | { ok: false; validCancelAmount: false; errorKey: string }

export function resolveNewAuthorizationInput({
  units,
  currentNode,
}: {
  units: string | number
  currentNode?: Pick<GovernanceNode, 'maxAuthorize' | 'totalPos'>
}): AuthorizationInputResult {
  const normalizedUnits = String(units).trim()

  if (!normalizedUnits || !varifyPositiveInt(normalizedUnits)) {
    return {
      ok: false,
      validInput: false,
      amount: 0,
      errorKey: 'nodeMgmt.invalidInput',
    }
  }

  const amount = parseInt(normalizedUnits, 10)
  const availableAmount =
    Number(currentNode?.maxAuthorize || 0) - Number(currentNode?.totalPos || 0)
  const validInput = amount <= availableAmount

  if (!validInput) {
    return {
      ok: false,
      validInput: false,
      amount,
      errorKey: 'nodeMgmt.invalidInput',
    }
  }

  return { ok: true, validInput: true, amount }
}

export function canOpenNewAuthorization({
  peerAttrs,
}: {
  peerAttrs?: Pick<PeerAttributes, 'maxAuthorize'>
}): ServiceResult<Record<never, never>, { level: 'warning' }> {
  if (Number(peerAttrs?.maxAuthorize || 0) === 0) {
    return {
      ok: false,
      errorKey: 'nodeMgmt.peerNotAllowAuthorize',
      level: 'warning',
    }
  }

  return { ok: true }
}

export async function createNewAuthorizationTransaction({
  currentNode,
  stakeWalletAddress,
  amount,
}: {
  currentNode: GovernanceNode
  stakeWalletAddress: string
  amount: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { error?: unknown }>> {
  if (!amount) {
    return { ok: false, errorKey: 'nodeMgmt.invalidInput' }
  }

  const nodePublicKey = normalizeNodePublicKey(currentNode)
  if (!nodePublicKey) {
    return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
  }

  return tryCreateTransaction({
    action: () =>
      createAuthorizationTransaction({
        stakeWalletAddress,
        nodePublicKey,
        amount,
      }),
    errorContext: 'createNewAuthorizationTransaction',
    logger,
  })
}

export function validateCancelAuthorizationAmount({
  cancelAmount,
  authorizationInfo,
}: {
  cancelAmount: string | number
  authorizationInfo?: Partial<AuthorizationInfo>
}): CancelAuthorizationAmountResult {
  const normalizedAmount = String(cancelAmount).trim()

  if (!normalizedAmount || !varifyPositiveInt(normalizedAmount)) {
    return {
      ok: false,
      validCancelAmount: false,
      errorKey: 'nodeMgmt.invalidInput',
    }
  }

  const inAuthorization =
    Number(authorizationInfo?.consensusPos || 0) +
    Number(authorizationInfo?.freezePos || 0) +
    Number(authorizationInfo?.newPos || 0)
  const validCancelAmount = Number(normalizedAmount) <= inAuthorization

  if (!validCancelAmount) {
    return {
      ok: false,
      validCancelAmount: false,
      errorKey: 'nodeMgmt.invalidInput',
    }
  }

  return {
    ok: true,
    validCancelAmount: true,
    amount: parseInt(normalizedAmount, 10),
  }
}

export async function createCancelAuthorizationTransaction({
  currentNode,
  stakeWalletAddress,
  cancelAmount,
  authorizationInfo,
}: {
  currentNode: GovernanceNode
  stakeWalletAddress: string
  cancelAmount: string | number
  authorizationInfo?: Partial<AuthorizationInfo>
}): Promise<
  TransactionDraftResult<SdkTransactionLike, { error?: unknown; validCancelAmount?: false }>
> {
  const validation = validateCancelAuthorizationAmount({
    cancelAmount,
    authorizationInfo,
  })
  if (!validation.ok) {
    return validation
  }

  const nodePublicKey = normalizeNodePublicKey(currentNode)
  if (!nodePublicKey) {
    return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
  }

  return tryCreateTransaction({
    action: () =>
      createUnauthorizationTransaction({
        stakeWalletAddress,
        nodePublicKey,
        amount: validation.amount,
      }),
    errorContext: 'createCancelAuthorizationTransaction',
    logger,
  })
}

export function createAuthorizationRewardsRedeemTransaction({
  stakeWalletAddress,
  amount,
}: {
  stakeWalletAddress: string
  amount: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if (!amount) {
    return Promise.resolve({
      ok: false,
      errorKey: 'nodeMgmt.noRewards',
      level: 'warning',
    })
  }

  return tryCreateTransaction({
    action: () => createWithdrawFeeTransaction({ stakeWalletAddress }),
    errorContext: 'createAuthorizationRewardsRedeemTransaction',
    logger,
  })
}

export function createAuthorizationClaimableOntRedeemTransaction({
  currentNode,
  stakeWalletAddress,
  authorizationInfo,
}: {
  currentNode: GovernanceNode
  stakeWalletAddress: string
  authorizationInfo?: Partial<AuthorizationInfo>
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if (!authorizationInfo?.withdrawUnfreezePos) {
    return Promise.resolve({
      ok: false,
      errorKey: 'nodeMgmt.noClaimableOnt',
      level: 'warning',
    })
  }

  const nodePublicKey = normalizeNodePublicKey(currentNode)
  if (!nodePublicKey) {
    return Promise.resolve({
      ok: false,
      errorKey: 'createSharedWallet.invalidPk',
    })
  }

  return tryCreateTransaction({
    action: () =>
      createWithdrawAuthorizationTransaction({
        stakeWalletAddress,
        nodePublicKey,
        amount: authorizationInfo.claimableVal as number,
      }),
    errorContext: 'createAuthorizationClaimableOntRedeemTransaction',
    logger,
  })
}

export function createAuthorizationUnboundOngRedeemTransaction({
  stakeWalletAddress,
  amount,
}: {
  stakeWalletAddress: string
  amount: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if (!amount) {
    return Promise.resolve({
      ok: false,
      errorKey: 'nodeMgmt.noUnboundOng',
      level: 'warning',
    })
  }

  return tryCreateTransaction({
    action: () => createWithdrawPeerUnboundOngTransaction({ stakeWalletAddress }),
    errorContext: 'createAuthorizationUnboundOngRedeemTransaction',
    logger,
  })
}
