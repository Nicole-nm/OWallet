/**
 * REST broadcast primitives — submit a serialized transaction to the chain, or
 * pre-execute it (read-only) for gas/precondition checks.
 */

import { getRestClient } from '../../shared/chain/restClient'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { serializeTx } from './serializationService'

export function sendTx(tx: SdkTransactionLike) {
  return getRestClient().sendRawTransaction(serializeTx(tx, 'transaction.sendTx.serialize'))
}

export function preExecTx(tx: SdkTransactionLike) {
  return getRestClient().sendRawTransaction(
    serializeTx(tx, 'transaction.preExecTx.serialize'),
    true
  )
}
