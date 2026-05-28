import type { TransactionDraftResult } from '../types'
import type { WalletSigner } from './types'
import type { SigningFailureResult } from '../../domains/transaction/types'

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

export function mapSigningFailure({
  wallet,
  field = 'messageKey',
  passwordErrorKey = 'common.pwdErr',
}: {
  wallet?: WalletSigner | null
  field?: 'messageKey' | 'errorKey'
  passwordErrorKey?: string
}): SigningFailureResult {
  if (wallet && typeof wallet === 'object' && 'key' in wallet && typeof wallet.key === 'string') {
    return field === 'messageKey'
      ? { ok: false, messageKey: passwordErrorKey }
      : { ok: false, errorKey: passwordErrorKey }
  }

  return { ok: false, cancelled: true }
}
