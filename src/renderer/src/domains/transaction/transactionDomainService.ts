import { reverseHex } from '../../shared/chain/sdkHex'
import { toSdkTransactionResponse } from '../../shared/chain/sdkBoundary'
import { sendTx } from './broadcast'
import { mapTransactionFailureResponse } from './transactionResults'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { createLogger } from '../../shared/lib/logger'
import type { SendTransactionResult } from './types'

const logger = createLogger('transactionDomainService')

export async function sendTransaction(tx: SdkTransactionLike): Promise<SendTransactionResult> {
  try {
    const response = toSdkTransactionResponse(await sendTx(tx))
    if (response?.Error === 0) {
      return {
        ok: true,
        response,
        txHash: reverseHex(tx.getHash()),
      }
    }

    return mapTransactionFailureResponse(response)
  } catch (err: unknown) {
    logger.error('sendTransaction', err)
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err) || null,
    }
  }
}
