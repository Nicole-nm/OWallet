/**
 * Transaction domain result types. Raw SDK transactions use the
 * `SdkTransactionLike` structural interface from `shared/chain/types`; this
 * module only adds the typed result of broadcasting one.
 */

import type { SdkTransactionResponseLike } from '../../shared/chain/types'
import type { TransactionFailureResult } from '../../shared/lib/result'

export type { TransactionFailureResult, SigningFailureResult } from '../../shared/lib/result'

/**
 * The result returned by `sendTransaction`.
 */
export type SendTransactionResult =
  | {
      ok: true
      response: SdkTransactionResponseLike
      txHash: string
    }
  | TransactionFailureResult
