import { sendTransaction } from './transactionDomainService'
import type { SdkTransactionLike } from '../../shared/chain/types'
import type { WalletAdapter } from '../wallet/adapter'
import type { SendTransactionResult, TransactionFailureResult } from './types'

interface MinimalLogger {
  error: (...args: unknown[]) => void
}

export interface SubmitWithAdapterInput {
  tx: SdkTransactionLike
  adapter: WalletAdapter
  password?: string
  /** Call adapter.addSignature() instead of adapter.signTransaction(). Default false. */
  useAddSignature?: boolean
  /** Error key on thrown errors. Default 'common.networkErr'. */
  networkErrorKey?: string
  /** Optional logger; called with (errorContext, err) when sign or submit throws. */
  logger?: MinimalLogger
  /** Label passed as the first arg to logger.error. Defaults to 'submitWithAdapter'. */
  errorContext?: string
}

export async function submitWithAdapter(
  input: SubmitWithAdapterInput
): Promise<SendTransactionResult | TransactionFailureResult>
export async function submitWithAdapter<TResult>(
  input: SubmitWithAdapterInput & {
    submit: (signedTx: SdkTransactionLike) => Promise<TResult>
  }
): Promise<TResult | TransactionFailureResult>
export async function submitWithAdapter<TResult = SendTransactionResult>({
  tx,
  adapter,
  password,
  useAddSignature = false,
  networkErrorKey = 'common.networkErr',
  logger,
  errorContext = 'submitWithAdapter',
  submit,
}: SubmitWithAdapterInput & {
  submit?: (signedTx: SdkTransactionLike) => Promise<TResult>
}): Promise<TResult | SendTransactionResult | TransactionFailureResult> {
  const { requiresPassword } = adapter.capabilities
  const ctx = { password: requiresPassword ? password : undefined }

  try {
    const signedTx = useAddSignature
      ? await adapter.addSignature(tx, ctx)
      : await adapter.signTransaction(tx, ctx)

    if (!signedTx) {
      return requiresPassword
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, cancelled: true }
    }

    return submit ? await submit(signedTx) : await sendTransaction(signedTx)
  } catch (error: unknown) {
    logger?.error(errorContext, error)
    return { ok: false, errorKey: networkErrorKey, error }
  }
}
