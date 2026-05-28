import i18n from '../../lang'
import { message } from 'ant-design-vue'
import { logger } from './logger'
import { hideRuntimeLoading } from './runtimeFeedback'

interface ErrorHandlerOptions {
  i18nKey?: string
  hideLoading?: boolean
  showMessage?: boolean
  useRawMessage?: boolean
}

/**
 * Extract a message suitable for display — drops file paths and stack frames
 * so we don't leak internals into a toast.
 */
export function extractSafeMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message.replace(/\bat\s+.+$/gm, '').trim()
  }
  return 'An unexpected error occurred'
}

/**
 * Show a toast for an error, hide any loading modal, and log it.
 * Prefer {@link withErrorBoundary} for new code — it wraps an async call and
 * returns a typed Result instead of relying on the caller to coordinate.
 */
export function handleError(err: unknown, options: ErrorHandlerOptions = {}) {
  const { i18nKey, hideLoading = true, showMessage = true, useRawMessage = false } = options

  logger.error(err)

  if (hideLoading) {
    hideRuntimeLoading()
  }

  if (showMessage) {
    if (i18nKey) {
      message.error(i18n.global.t(i18nKey))
    } else if (useRawMessage) {
      message.error(extractSafeMessage(err))
    } else {
      message.error(i18n.global.t('common.networkErr'))
    }
  }
}

export function handleNetworkError(err: unknown) {
  handleError(err, { i18nKey: 'common.networkErr' })
}

export function handleLedgerError(err: unknown) {
  handleError(err, { i18nKey: 'ledgerWallet.signFailed' })
}

export type { Ok, Err, BoundaryResult as Result } from './result/types'
export { withErrorBoundary } from './result/errorBoundary'

/**
 * Normalize a thrown error into the canonical `{ ok: false, errorKey }` shape
 * used across application services. Does NOT toast — pair with `notifyError`
 * or use {@link withErrorBoundary} if you want toast + log + result in one.
 */
export function toResult<K extends string = string>(
  err: unknown,
  errorKey: K = 'common.networkErr' as K
): { ok: false; errorKey: K; error: unknown } {
  return { ok: false, errorKey, error: err }
}
