import type { TransactionFailureResult } from './types'

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
