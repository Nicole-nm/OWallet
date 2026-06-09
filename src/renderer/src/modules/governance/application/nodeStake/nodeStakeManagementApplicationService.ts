import {
  createWithdrawFeeTransaction,
  createWithdrawPeerUnboundOngTransaction,
} from '../../../../domains/governance/governanceDomainService'
import {
  createDelegatedStakeTransactionBody,
  submitDelegatedStakeTransaction,
} from '../../../../domains/governance/nodeStakeDomainService'
import { submitWithAdapter } from '../../../../domains/transaction/submitWithAdapter'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCreateTransaction } from '../../../../domains/transaction/transactionResults'
import type { TransactionDraftResult } from '../../../../shared/types'
import { NetworkId } from '../../../../shared/lib/types'
import type {
  SendTransactionResult,
  TransactionFailureResult,
} from '../../../../domains/transaction/types'
import type { SdkTransactionLike } from '../../../../shared/chain/types'
import type { WalletAdapter } from '../../../wallet/application/adapter/WalletAdapterFactory'
import { resolveDefaultGasPrice } from '../../../../shared/lib/constants'
import { setUnsignedTransactionGasPrice } from '../../../../domains/transaction/transactionGasPrice'
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
  adapter,
  password,
  network,
  ontid,
  nodePublicKey,
  stakeWalletAddress,
  delegate = true,
  ledgerConnected = true,
}: {
  tx: SdkTransactionLike | unknown
  adapter: WalletAdapter
  password?: string
  network: NetworkId
  ontid: string
  nodePublicKey: string
  stakeWalletAddress: string
  delegate?: boolean
  ledgerConnected?: boolean
}): Promise<NodeStakeManagementSubmissionResult> {
  const { requiresPassword, requiresHardwareDevice } = adapter.capabilities

  if (requiresPassword && !password) {
    return { ok: false, errorKey: 'nodeStake.passwordEmpty' }
  }

  if (!tx) {
    return { ok: false, errorKey: 'common.txFailed' }
  }

  if (requiresHardwareDevice && !ledgerConnected) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  const baseOptions = {
    tx:
      adapter.identity.type === 'ledger'
        ? setUnsignedTransactionGasPrice(tx as SdkTransactionLike, resolveDefaultGasPrice('ledger'))
        : (tx as SdkTransactionLike),
    adapter,
    password,
    networkErrorKey: requiresHardwareDevice ? 'ledgerWallet.signFailed' : 'common.unexpectedError',
    logger,
    errorContext: 'submitSignedNodeStakeManagementTransaction',
  }

  if (delegate) {
    return submitWithAdapter({
      ...baseOptions,
      submit: async (signedTx: SdkTransactionLike) => {
        const body = createDelegatedStakeTransactionBody({
          tx: signedTx,
          ontid,
          publicKey: nodePublicKey,
          stakeWalletAddress,
        })
        await submitDelegatedStakeTransaction(network, body)
        return { ok: true as const, delegated: true as const }
      },
    })
  }

  return submitWithAdapter(baseOptions)
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
