import { logger as defaultLogger } from '../logger'

interface LoggerLike {
  error(context: string, error: unknown): void
}

interface TryCatchOptions<F extends object> {
  /** Logger context label. Required so failures are traceable. */
  context: string
  /** i18n key surfaced on the failure result. Default: 'common.networkErr'. */
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

export type TryCatchResult<S extends SuccessShape, F extends object> = S extends object
  ? ({ ok: true } & S) | ({ ok: false; errorKey: string; error: unknown } & F)
  : { ok: true } | ({ ok: false; errorKey: string; error: unknown } & F)

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
    return { ok: false, errorKey, error: err, ...extras } as TryCatchResult<S, F>
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
