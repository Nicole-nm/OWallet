/**
 * Transaction domain types.
 *
 * These interfaces wrap the raw SDK objects with named shapes that reflect
 * the lifecycle of an Ontology transaction inside OWallet:
 *   draft → signed → sent (response received)
 *
 * The ontology-ts-sdk does not export typed transaction classes, so we rely
 * on the SdkTransactionLike structural interface from shared/chain/types and
 * add domain-level aliases that make intent explicit at call sites.
 */

import type { SdkTransactionLike, SdkTransactionResponseLike } from '../../shared/chain/types'

/**
 * A transaction that has been constructed but not yet signed.
 * Semantically identical to SdkTransactionLike; the distinction is in how
 * it is used in the signing pipeline.
 */
export type TransactionDraft = SdkTransactionLike

/**
 * A transaction that has been signed and is ready to broadcast.
 * After signing the `sigs` array on the object is populated, so this type
 * is the same shape — the "signed" distinction lives at the call-site
 * convention rather than a structural difference enforced by the SDK.
 */
export type SignedTransaction = SdkTransactionLike

/**
 * Common failure payload used by transaction workflows.
 */
export interface TransactionFailureResult {
  ok: false
  cancelled?: true
  messageKey?: string
  errorKey?: string
  detail?: string
  message?: string | null
  error?: unknown
  level?: 'warning'
}

/**
 * The result returned by `sendTransaction` / `signAndSendTransaction`.
 */
export type SendTransactionResult =
  | {
      ok: true
      response: SdkTransactionResponseLike
      txHash: string
    }
  | TransactionFailureResult

/**
 * The result returned when signing fails (wrong password or ledger cancel).
 */
export type SigningFailureResult = TransactionFailureResult
