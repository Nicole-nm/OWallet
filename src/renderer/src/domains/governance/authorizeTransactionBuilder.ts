/**
 * authorizeTransactionBuilder.ts
 *
 * Transaction builders related to authorization staking (authorize,
 * unauthorize, withdraw, init-pos, fee withdrawal). Read-only governance state
 * accessors live in `governanceStorageReader.ts`.
 */

import { GAS_PRICE, GAS_LIMIT } from '../../shared/lib/constants'
import { invokeSdkTransactionBuilder } from '../../shared/chain/sdkBoundary'
import { resolveGovContext } from './governanceSdkLoader'
import type { SdkTransactionLike } from '../../shared/chain/types'

function createStakeTxBuilder(method: string) {
  return async (
    address: string | { serialize: () => string },
    peerPKs: string[],
    amounts: (number | string)[],
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    return invokeSdkTransactionBuilder(
      GovernanceTxBuilder,
      method,
      [userAddr, peerPKs, amounts, payerAddr, gasPrice, gasLimit],
      `GovernanceTxBuilder.${method}`
    )
  }
}

function createPeerValueTxBuilder(method: string) {
  return async (
    peerPubkey: string,
    address: string | { serialize: () => string },
    value: number | string,
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    return invokeSdkTransactionBuilder(
      GovernanceTxBuilder,
      method,
      [peerPubkey, userAddr, value, payerAddr, gasPrice, gasLimit],
      `GovernanceTxBuilder.${method}`
    )
  }
}

function createSimpleTxBuilder(method: string) {
  return async (
    address: string | { serialize: () => string },
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    return invokeSdkTransactionBuilder(
      GovernanceTxBuilder,
      method,
      [userAddr, payerAddr, gasPrice, gasLimit],
      `GovernanceTxBuilder.${method}`
    )
  }
}

// ---------------------------------------------------------------------------
// Authorization stake transaction builders
// ---------------------------------------------------------------------------

export const buildAuthorizeForPeer = createStakeTxBuilder('makeAuthorizeForPeerTx')
export const buildUnauthorizeForPeer = createStakeTxBuilder('makeUnauthorizeForPeerTx')
export const buildWithdraw = createStakeTxBuilder('makeWithdrawTx')

export const buildAddInitPos = createPeerValueTxBuilder('makeAddInitPosTx')
export const buildReduceInitPos = createPeerValueTxBuilder('makeReduceInitPosTx')
export const buildChangeAuthorization = createPeerValueTxBuilder('makeChangeAuthorizationTx')

export const buildWithdrawFee = createSimpleTxBuilder('makeWithdrawFeeTx')
export const buildWithdrawPeerUnboundOng = createSimpleTxBuilder('makeWithdrawPeerUnboundOngTx')
