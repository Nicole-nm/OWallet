/**
 * Shared Result helpers for the transaction pipeline: map a chain failure
 * response to a typed failure Result, and wrap a transaction-building action so
 * a throw becomes a failure Result instead of a rejection.
 */

import type { TransactionDraftResult, TransactionFailureResult } from '../../shared/lib/result'

export interface TransactionFailureResponseLike {
  Error?: unknown
  Result?: unknown
}

export function mapTransactionFailureResponse(
  response: TransactionFailureResponseLike | null | undefined
): TransactionFailureResult {
  const detail = String(response?.Result || '')

  if (detail.toLowerCase().includes('cover gas cost')) {
    return { ok: false, errorKey: 'common.ongNoEnough', detail }
  }

  if (detail.toLowerCase().includes('balance insufficient')) {
    return { ok: false, errorKey: 'common.balanceInsufficient', detail }
  }

  return { ok: false, message: detail || null, detail }
}

interface LoggerLike {
  error(context: string, error: unknown): void
}

export async function tryCreateTransaction<T>({
  action,
  errorContext,
  logger,
  errorKey = 'common.networkErr',
}: {
  action: () => Promise<T>
  errorContext: string
  logger: LoggerLike
  errorKey?: string
}): Promise<TransactionDraftResult<T, { error: unknown }>> {
  try {
    return { ok: true, tx: await action() }
  } catch (error: unknown) {
    logger.error(errorContext, error)
    return { ok: false, errorKey, error }
  }
}
