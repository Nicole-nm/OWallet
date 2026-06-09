import { logger as defaultLogger } from '../logger'
import { classifyError } from '../errors'
import { failure, success } from './types'
import type { FailureMetadata, Result } from './types'

interface LoggerLike {
  error(context: string, error: unknown): void
}

interface TryResultOptions {
  /** Logger context label, so failures are traceable. */
  context: string
  /** i18n key for the failure. Domain services pass their own (e.g. 'common.savedbFailed'). */
  errorKey: string
  /** Optional module logger. Defaults to the global logger. */
  logger?: LoggerLike
  /**
   * Maps the caught error into failure metadata (category/code/cause/...).
   * Defaults to `classifyError`; domain sites pass `mapStorageError` /
   * `mapNetworkError` to preserve their existing categorisation.
   */
  mapError?: (error: unknown) => FailureMetadata
}

/**
 * `Result<T>` counterpart to `tryCatch`. Wraps an async op: on success returns
 * `success(value)`, on throw logs and returns `failure(errorKey, …, mapError(err))`.
 * Use this at domain-service catch sites that return the `{ ok, data }` `Result`
 * shape rather than the spread `{ ok: true, … }` shape `tryCatch` produces.
 */
export async function tryResult<T>(
  op: () => Promise<T>,
  options: TryResultOptions
): Promise<Result<T>> {
  const { context, errorKey, logger = defaultLogger, mapError = classifyError } = options
  try {
    return success(await op())
  } catch (err) {
    logger.error(context, err)
    return failure<T>(errorKey, undefined, mapError(err))
  }
}
