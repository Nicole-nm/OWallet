import { notifyError } from '../../ui/feedback'
import type { BoundaryResult, Ok } from './types'

interface LoggerLike {
  error(context: string, error: unknown): void
}

interface WorkflowBoundaryOptions<K extends string> {
  logger: LoggerLike
  context: string
  errorKey?: K
  /** Toast the errorKey on failure. Default true. */
  toast?: boolean
  /** When true, treat `errorKey` as a literal message rather than an i18n key. */
  literal?: boolean
}

/**
 * Workflow-layer twin of `withErrorBoundary`. Differs in two ways:
 * - takes the caller's module logger instead of the global logger,
 * - toasts via `notifyError` (i18n-aware, supports `literal` messages).
 *
 *   const r = await withWorkflowBoundary(() => doThing(), {
 *     logger,
 *     context: 'doThing',
 *     errorKey: 'common.networkErr',
 *   })
 *   if (!r.ok) return r
 */
export async function withWorkflowBoundary<T, K extends string = string>(
  op: () => Promise<T>,
  options: WorkflowBoundaryOptions<K>
): Promise<BoundaryResult<T, K>> {
  const {
    logger,
    context,
    errorKey = 'common.networkErr' as K,
    toast = true,
    literal = false,
  } = options
  try {
    const data = await op()
    return (data === undefined ? { ok: true } : { ok: true, data }) as Ok<T>
  } catch (err) {
    logger.error(context, err)
    if (toast) notifyError(errorKey, literal ? { literal: true } : undefined)
    return { ok: false, errorKey, error: err }
  }
}

/**
 * Imperative twin of `withWorkflowBoundary` for code paths that already own
 * their try/catch but want the same log + toast + Result shape on the failure
 * branch. Prefer `withWorkflowBoundary` for new code.
 */
export function handleWorkflowError({
  error,
  logger,
  context,
  errorKey = 'common.networkErr',
  literal = false,
}: {
  error: unknown
  logger: LoggerLike
  context: string
  errorKey?: string
  literal?: boolean
}) {
  logger.error(context, error)
  notifyError(errorKey, literal ? { literal: true } : undefined)
  return { ok: false as const, errorKey, error }
}
