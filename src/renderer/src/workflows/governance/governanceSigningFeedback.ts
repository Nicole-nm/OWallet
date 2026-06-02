import { notifyFailure } from '../../shared/ui/notifyFailure'
import { getDefaultErrorKeyForCategory } from '../../shared/lib/errors'
import type { ErrorCategory, FailureMetadata } from '../../shared/lib/result/types'

export interface GovernanceSigningFailureFeedback extends FailureMetadata {
  level?: string
  errorKey?: string
}

/**
 * Surface a governance signing failure via the rich toast pipeline. Preserves
 * the classifier's category/code/cause so the user sees the precise message
 * (e.g. "Signature rejected on Ledger device" rather than a generic network
 * error). Falls back to the category default or `common.unexpectedError` when
 * the caller does not supply an explicit key.
 */
export function notifyGovernanceSigningFailure(
  result: GovernanceSigningFailureFeedback | null | undefined,
  fallbackErrorKey?: string
) {
  const category = (result?.category as ErrorCategory | undefined) ?? undefined
  const resolvedFallback =
    fallbackErrorKey ?? getDefaultErrorKeyForCategory(category) ?? 'common.unexpectedError'

  const failureLike = {
    ok: false as const,
    errorKey: result?.errorKey,
    category,
    code: result?.code,
    detail: result?.detail,
    cause: result?.cause,
    retryable: result?.retryable,
    level: result?.level,
  }

  notifyFailure(failureLike, resolvedFallback)
  const errorKey = failureLike.errorKey ?? resolvedFallback
  return result?.level === 'warning'
    ? { level: 'warning' as const, errorKey }
    : { level: 'error' as const, errorKey }
}
