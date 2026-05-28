/**
 * governanceSdkLoader.ts
 *
 * Shared SDK loading and address resolution helpers for governance transaction builders.
 * Extracted to avoid duplication between authorizeTransactionBuilder and candidateTransactionBuilder.
 */

import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'

export async function loadGovernanceSdk() {
  const { Crypto, GovernanceTxBuilder, utils } = await loadOntologySdk()
  return { Crypto, GovernanceTxBuilder, utils }
}

export async function resolveGovContext(
  address: string | { serialize: () => string },
  payer?: string | { serialize: () => string }
) {
  const { Crypto, GovernanceTxBuilder } = await loadGovernanceSdk()
  const addr = (v: string | { serialize: () => string }) => {
    if (typeof v === 'string') return new Crypto.Address(v)
    return v
  }
  const userAddr = addr(address)
  const payerAddr = payer ? addr(payer) : userAddr
  return { GovernanceTxBuilder, userAddr, payerAddr }
}
