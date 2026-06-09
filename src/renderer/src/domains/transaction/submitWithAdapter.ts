import { sendTransaction } from './transactionDomainService'
import type { SdkTransactionLike } from '../../shared/chain/types'
import type { WalletAdapter } from '../wallet/adapter'
import type { SendTransactionResult, TransactionFailureResult } from './types'
import { classifierKeyWins, classifyError } from '../../shared/lib/errors'

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
    const payload = classifyError(error)
    const resolvedErrorKey = classifierKeyWins(payload) ? payload.errorKey : networkErrorKey
    return { ok: false, ...payload, errorKey: resolvedErrorKey, error }
  }
}

/**
 * Build a draft transaction then submit it through the adapter. Wraps the
 * "create the tx (mapping any throw to the network error key) then hand off to
 * {@link submitWithAdapter}" shape shared by the common transfer/redeem flows.
 */
export async function buildAndSubmit({
  build,
  ...submitInput
}: Omit<SubmitWithAdapterInput, 'tx'> & {
  build: () => Promise<SdkTransactionLike>
}): Promise<SendTransactionResult | TransactionFailureResult> {
  const networkErrorKey = submitInput.networkErrorKey ?? 'common.networkErr'
  let tx: SdkTransactionLike
  try {
    tx = await build()
  } catch (error: unknown) {
    return { ok: false, errorKey: networkErrorKey, error }
  }

  return submitWithAdapter({ ...submitInput, tx })
}
