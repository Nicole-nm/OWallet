import { notifyError, notifyWarning, showAppError, showAppWarning } from './feedback'
import { getDefaultErrorKeyForCategory } from '../lib/errors'
import type { AppErrorCode, AppErrorPayload, ErrorCategory } from '../lib/result/types'

export type FailureLike = {
  ok?: boolean
  errorKey?: string
  category?: ErrorCategory
  code?: AppErrorCode
  detail?: unknown
  cause?: unknown
  retryable?: boolean
  level?: 'warning' | string
}

function hasClassificationMetadata(result: FailureLike): boolean {
  return Boolean(result.category || result.code || result.cause)
}

function toAppErrorPayload(result: FailureLike, key: string): AppErrorPayload {
  return {
    category: result.category ?? 'unknown',
    code: result.code ?? 'unknown.unexpected',
    errorKey: key,
    detail: typeof result.detail === 'string' ? result.detail : undefined,
    cause: result.cause,
    retryable: result.retryable,
    level: result.level === 'warning' ? 'warning' : 'error',
  }
}

/**
 * Surface a failure result via the standard toast. Returns true when the result
 * is a failure so callers can early-return: `if (notifyFailure(result)) return`.
 * Picks notifyWarning when `result.level === 'warning'`, else notifyError.
 *
 * When the failure carries classification metadata (category, code, cause from
 * the classifier), routes through the app-error pipeline so the classifier can
 * still pick the precise user-facing message. The final surface is always the
 * standard message toast.
 *
 * Acts as a type predicate so the success branch stays narrowed after the
 * early return.
 */
export function notifyFailure<T extends FailureLike>(
  result: T | null | undefined,
  fallbackKey?: string
): result is T & { ok: false } {
  if (!result) return false
  if (result.ok === true) return false
  const key = result.errorKey ?? fallbackKey ?? getDefaultErrorKeyForCategory(result.category)
  if (key === undefined) return true

  if (hasClassificationMetadata(result)) {
    const payload = toAppErrorPayload(result, key)
    if (result.level === 'warning') {
      showAppWarning(payload)
    } else {
      showAppError(payload)
    }
    return true
  }

  if (result.level === 'warning') {
    notifyWarning(key)
  } else {
    notifyError(key)
  }
  return true
}
