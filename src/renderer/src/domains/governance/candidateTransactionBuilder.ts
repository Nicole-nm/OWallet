/**
 * candidateTransactionBuilder.ts
 *
 * Transaction builders for candidate node operations:
 * register candidate, unregister candidate, quit node, set fee percentage.
 */

import { GAS_PRICE, GAS_LIMIT, GAS_LIMIT_HIGH } from '../../shared/lib/constants'
import { resolveGovContext } from './governanceSdkLoader'
import type { SdkTransactionLike } from '../../shared/chain/types'

function createPeerTxBuilder(method: string) {
  return async (
    address: string | { serialize: () => string },
    peerPubkey: string,
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    const builder = GovernanceTxBuilder as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >
    return builder[method]!(
      userAddr,
      peerPubkey,
      payerAddr,
      gasPrice,
      gasLimit
    ) as SdkTransactionLike
  }
}

// ---------------------------------------------------------------------------
// Candidate transaction builders
// ---------------------------------------------------------------------------

export const buildUnregisterCandidate = createPeerTxBuilder('makeUnregisterCandidateTx')
export const buildQuitNode = createPeerTxBuilder('makeQuitNodeTx')

export async function buildRegisterCandidate(
  ontid: string,
  peerPubkey: string,
  keyNo: number | string,
  address: string | { serialize: () => string },
  initPos: number | string,
  payer: string | { serialize: () => string },
  gasPrice = GAS_PRICE,
  gasLimit = GAS_LIMIT_HIGH
): Promise<SdkTransactionLike> {
  const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
  const builder = GovernanceTxBuilder as unknown as Record<string, (...args: unknown[]) => unknown>
  return builder.makeRegisterCandidateTx!(
    ontid,
    peerPubkey,
    keyNo,
    userAddr,
    initPos,
    payerAddr,
    gasPrice,
    gasLimit
  ) as SdkTransactionLike
}

export async function buildSetFeePercentage(
  peerPubkey: string,
  address: string | { serialize: () => string },
  peerCost: number | string,
  stakeCost: number | string,
  payer: string | { serialize: () => string },
  gasPrice = GAS_PRICE,
  gasLimit = GAS_LIMIT
): Promise<SdkTransactionLike> {
  const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
  const builder = GovernanceTxBuilder as unknown as Record<string, (...args: unknown[]) => unknown>
  return builder.makeSetFeePercentageTx!(
    peerPubkey,
    userAddr,
    peerCost,
    stakeCost,
    payerAddr,
    gasPrice,
    gasLimit
  ) as SdkTransactionLike
}
