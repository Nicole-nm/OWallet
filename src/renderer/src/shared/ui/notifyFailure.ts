import { notifyError, notifyWarning } from './feedback'
import { getDefaultErrorKeyForCategory } from '../lib/errors'
import type { AppErrorCode, ErrorCategory } from '../lib/result/types'

export type FailureLike = {
  ok?: boolean
  errorKey?: string
  category?: ErrorCategory
  code?: AppErrorCode
  detail?: unknown
  level?: 'warning' | string
}

/**
 * Surface a failure result via the standard toast. Returns true when the result
 * is a failure so callers can early-return: `if (notifyFailure(result)) return`.
 * Picks notifyWarning when `result.level === 'warning'`, else notifyError.
 *
 * Acts as a type predicate so the success branch stays narrowed after the
 * early return. Lives in its own module so that test files which mock
 * `./feedback` keep intercepting the underlying notify calls without having
 * to also expose `notifyFailure`.
 */
export function notifyFailure<T extends FailureLike>(
  result: T | null | undefined,
  fallbackKey?: string
): result is T & { ok: false } {
  if (!result) return false
  if (result.ok === true) return false
  const key = result.errorKey ?? fallbackKey ?? getDefaultErrorKeyForCategory(result.category)
  if (key === undefined) return true
  if (result.level === 'warning') {
    notifyWarning(key)
  } else {
    notifyError(key)
  }
  return true
}
