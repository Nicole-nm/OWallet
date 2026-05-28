import i18n from '../../../lang'
import { message } from 'ant-design-vue'
import { logger } from '../logger'
import { hideRuntimeLoading } from '../runtimeFeedback'
import type { BoundaryResult, Ok } from './types'

interface ErrorBoundaryOptions<K extends string> {
  /** i18n key for the toast + result when the operation throws. */
  errorKey?: K
  /** Logger context label; falls back to the module-level logger. */
  context?: string
  /** Hide any active runtime loading modal on failure. Default true. */
  hideLoading?: boolean
  /** Emit a toast on failure. Default true at the workflow layer; pass `false` from services that return Results without side effects. */
  toast?: boolean
}

/**
 * Wrap an async operation: log + (optional toast) + runtime-loading-hide on
 * throw, return a typed Result in both paths. Replaces the ad-hoc try/catch +
 * handleError pattern in application services.
 *
 *   const r = await withErrorBoundary(() => api.import(...), {
 *     errorKey: 'wallet.importFailed',
 *     context: 'walletImport',
 *     toast: false,
 *   })
 *   if (!r.ok) return r
 *   // r.data is the resolved value
 */
export async function withErrorBoundary<T, K extends string = string>(
  op: () => Promise<T>,
  options: ErrorBoundaryOptions<K> = {}
): Promise<BoundaryResult<T, K>> {
  const { errorKey = 'common.networkErr' as K, context, hideLoading = true, toast = true } = options
  try {
    const data = await op()
    return (data === undefined ? { ok: true } : { ok: true, data }) as Ok<T>
  } catch (err) {
    if (context) logger.error(context, err)
    else logger.error(err)
    if (hideLoading) hideRuntimeLoading()
    if (toast) message.error(i18n.global.t(errorKey))
    return { ok: false, errorKey, error: err }
  }
}
