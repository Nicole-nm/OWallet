import {
  createWithdrawFeeTransaction,
  createWithdrawPeerUnboundOngTransaction,
} from '../../../domains/governance/applicationService'
import {
  createDelegatedStakeTransactionBody,
  submitDelegatedStakeTransaction,
} from '../../../domains/nodeStake/applicationService'
import { sendTransaction, signTransaction } from '../../../domains/transaction/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCreateTransaction } from '../../../shared/lib/transactionHelper'
import type { TransactionDraftResult } from '../../../shared/types'
import { NetworkId, CommonWallet, HardwareWallet, isCommonWallet } from '../../../shared/lib/types'
import type {
  SendTransactionResult,
  TransactionFailureResult,
} from '../../../domains/transaction/types'
import type { SdkTransactionLike } from '../../../shared/chain/types'
export {
  refreshNodeStakeManagementDetails,
  refreshNodeStakeAuthorizationDetails,
} from './nodeStakeRefreshService'
export {
  validateReduceInitPosAmount,
  validateStakeAuthorizationUnit,
} from './nodeStakeValidationService'
export {
  createNodeRecallTransaction,
  createNodeRefundTransaction,
  createQuitNodeManagementTransaction,
  createAddInitPosManagementTransaction,
  createReduceInitPosManagementTransaction,
  createRedeemInitPosManagementTransaction,
  createChangeStakeAuthorizationTransaction,
  createChangeStakeCostTransaction,
} from './nodeStakeTransactionService'

const logger = createLogger('nodeStakeManagementApplicationService')

type NodeStakeManagementSubmissionResult =
  | SendTransactionResult
  | TransactionFailureResult
  | { ok: true; delegated: true }

export async function submitSignedNodeStakeManagementTransaction({
  tx,
  wallet,
  password,
  network,
  ontid,
  nodePublicKey,
  stakeWalletAddress,
  delegate = true,
  ledgerConnected = true,
}: {
  tx: SdkTransactionLike | unknown
  wallet?: CommonWallet | HardwareWallet
  password?: string
  network: NetworkId
  ontid: string
  nodePublicKey: string
  stakeWalletAddress: string
  delegate?: boolean
  ledgerConnected?: boolean
}): Promise<NodeStakeManagementSubmissionResult> {
  const isCommonWalletSigner = isCommonWallet(wallet)

  if (!wallet) {
    return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
  }

  if (isCommonWalletSigner && !password) {
    return { ok: false, errorKey: 'nodeStake.passwordEmpty' }
  }

  if (!tx) {
    return { ok: false, errorKey: 'common.txFailed' }
  }

  if (!isCommonWalletSigner && !ledgerConnected) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  try {
    const signedTx = await signTransaction({
      tx: tx as SdkTransactionLike,
      wallet,
      password: isCommonWalletSigner ? password : undefined,
    })

    if (!signedTx) {
      return isCommonWalletSigner
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, cancelled: true }
    }

    if (delegate) {
      const body = createDelegatedStakeTransactionBody({
        tx: signedTx,
        ontid,
        publicKey: nodePublicKey,
        stakeWalletAddress,
      })
      await submitDelegatedStakeTransaction(network, body)
      return { ok: true, delegated: true }
    }

    return sendTransaction(signedTx)
  } catch (err: unknown) {
    logger.error('submitSignedNodeStakeManagementTransaction', err)
    return {
      ok: false,
      errorKey: isCommonWalletSigner ? 'common.networkErr' : 'ledgerWallet.signFailed',
      error: err,
    }
  }
}

export async function createStakeRewardsRedeemTransaction({
  stakeWalletAddress,
  amount,
}: {
  stakeWalletAddress: string
  amount: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if (!amount) {
    return { ok: false, level: 'warning', errorKey: 'nodeMgmt.noRewards' }
  }

  return tryCreateTransaction({
    action: () => createWithdrawFeeTransaction({ stakeWalletAddress }),
    errorContext: 'createStakeRewardsRedeemTransaction',
    logger,
  })
}

export async function createStakeUnboundOngRedeemTransaction({
  stakeWalletAddress,
  amount,
}: {
  stakeWalletAddress: string
  amount: number
}): Promise<TransactionDraftResult<SdkTransactionLike, { level?: 'warning'; error?: unknown }>> {
  if (!amount) {
    return { ok: false, level: 'warning', errorKey: 'nodeMgmt.noUnboundOng' }
  }

  return tryCreateTransaction({
    action: () => createWithdrawPeerUnboundOngTransaction({ stakeWalletAddress }),
    errorContext: 'createStakeUnboundOngRedeemTransaction',
    logger,
  })
}
