import { notifyError, notifySuccess, showSuccessModal, translateFeedback } from '../ui/feedback'

interface TransactionFeedbackInput {
  ok: boolean
  txHash?: string
  errorKey?: string
  message?: string | null
}

interface TransactionFeedbackOptions {
  successMessageKey?: string
  successModalTitle?: string
  txHashPrefix?: string
  prependErrorPrefix?: boolean
  errorPrefixKey?: string
}

type TransactionFeedbackResult =
  | { ok: false; errorKey: string; message?: string | null }
  | { ok: true; txHash?: string }

export function formatTransactionHash(txHash: string, prefix?: string): string {
  return `${prefix ?? translateFeedback('common.transactionHashPrefix')}${txHash}`
}

export function handleTransactionFeedback(
  result: TransactionFeedbackInput | null | undefined,
  options: TransactionFeedbackOptions = {}
): TransactionFeedbackResult {
  const {
    successMessageKey = 'common.transSentSuccess',
    successModalTitle = 'common.transSentSuccess',
    txHashPrefix,
    prependErrorPrefix = true,
    errorPrefixKey = 'common.txFailed',
  } = options

  if (!result?.ok) {
    if (result?.errorKey) {
      notifyError(result.errorKey)
      return { ok: false, errorKey: result.errorKey }
    }

    if (result?.message) {
      const message = prependErrorPrefix
        ? `${translateFeedback(errorPrefixKey)} ${result.message}`
        : result.message
      notifyError(message, { literal: true })
      return { ok: false, errorKey: 'common.txFailed', message: result.message }
    }

    notifyError('common.txFailed')
    return { ok: false, errorKey: 'common.txFailed' }
  }

  notifySuccess(successMessageKey)

  const txHash = result.txHash
  if (txHash) {
    setTimeout(() => {
      showSuccessModal({
        title: successModalTitle,
        content: formatTransactionHash(txHash, txHashPrefix),
      })
    }, 100)
  }

  return { ok: true, txHash: result.txHash }
}
