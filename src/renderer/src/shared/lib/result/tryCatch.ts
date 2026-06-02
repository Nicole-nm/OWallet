import { logger as defaultLogger } from '../logger'
import { classifierKeyWins, classifyError } from '../errors'

interface LoggerLike {
  error(context: string, error: unknown): void
}

interface TryCatchOptions<F extends object> {
  /** Logger context label. Required so failures are traceable. */
  context: string
  /**
   * Fallback i18n key when the classifier can't categorise the error.
   * Typed errors (`LedgerSigningError`), HTTP errors, and timeouts take
   * precedence — this hint is only used when classifyError returns 'unknown'.
   * Default: 'common.networkErr'.
   */
  errorKey?: string
  /** Optional module logger. Defaults to the global logger. */
  logger?: LoggerLike
  /**
   * Extra fields to include on the failure return — e.g. empty entities so
   * callers don't have to null-check.  Returns a fresh object on each failure.
   */
  onFailure?: () => F
}

type TryCatchDefaults = Partial<Pick<TryCatchOptions<Record<never, never>>, 'errorKey' | 'logger'>>
type TryCatchOverrides<F extends object> = Omit<TryCatchOptions<F>, 'errorKey' | 'logger'> &
  Partial<Pick<TryCatchOptions<F>, 'errorKey' | 'logger'>>

type SuccessShape = Record<string, unknown> | void

type ClassifiedFailureFields = {
  category?: import('./types').ErrorCategory
  code?: import('./types').AppErrorCode
  detail?: string
  cause?: unknown
  retryable?: boolean
  level?: 'warning' | 'error'
}

export type TryCatchResult<S extends SuccessShape, F extends object> = S extends object
  ?
      | ({ ok: true } & S)
      | ({ ok: false; errorKey: string; error: unknown } & ClassifiedFailureFields & F)
  : { ok: true } | ({ ok: false; errorKey: string; error: unknown } & ClassifiedFailureFields & F)

/**
 * Wrap an async op that already produces a service-shaped success object
 * (`{ field1, field2, ... }`) and merge it into a `{ ok: true, ... }` result.
 * On throw, log + return `{ ok: false, errorKey, error, ...onFailure() }`.
 *
 *   return tryCatch(
 *     async () => ({ detail: mapStakeDetail(await fetch(...)) }),
 *     {
 *       context: 'loadStakeDetail',
 *       errorKey: 'common.networkErr',
 *       onFailure: () => ({ detail: createEmptyStakeDetail() }),
 *     }
 *   )
 */
export async function tryCatch<S extends SuccessShape, F extends object = Record<never, never>>(
  op: () => Promise<S>,
  options: TryCatchOptions<F>
): Promise<TryCatchResult<S, F>> {
  const { context, errorKey = 'common.networkErr', logger = defaultLogger, onFailure } = options
  try {
    const value = await op()
    return (value === undefined ? { ok: true } : { ok: true, ...value }) as TryCatchResult<S, F>
  } catch (err) {
    logger.error(context, err)
    const extras = onFailure ? onFailure() : ({} as F)
    const payload = classifyError(err)
    const resolvedErrorKey = classifierKeyWins(payload) ? payload.errorKey : errorKey
    return {
      ok: false,
      category: payload.category,
      code: payload.code,
      detail: payload.detail,
      cause: payload.cause,
      retryable: payload.retryable,
      level: payload.level,
      errorKey: resolvedErrorKey,
      error: err,
      ...extras,
    } as TryCatchResult<S, F>
  }
}

export function createTryCatch(defaultOptions: TryCatchDefaults) {
  return function tryCatchWithDefaults<
    S extends SuccessShape,
    F extends object = Record<never, never>,
  >(op: () => Promise<S>, options: TryCatchOverrides<F>): Promise<TryCatchResult<S, F>> {
    return tryCatch(op, { ...defaultOptions, ...options } as TryCatchOptions<F>)
  }
}
