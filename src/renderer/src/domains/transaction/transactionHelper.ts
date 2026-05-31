import type { TransactionDraftResult } from '../../shared/lib/result'

interface LoggerLike {
  error(context: string, error: unknown): void
}

export async function tryCreateTransaction<T>({
  action,
  errorContext,
  logger,
  errorKey = 'common.networkErr',
}: {
  action: () => Promise<T>
  errorContext: string
  logger: LoggerLike
  errorKey?: string
}): Promise<TransactionDraftResult<T, { error: unknown }>> {
  try {
    return { ok: true, tx: await action() }
  } catch (error: unknown) {
    logger.error(errorContext, error)
    return { ok: false, errorKey, error }
  }
}
