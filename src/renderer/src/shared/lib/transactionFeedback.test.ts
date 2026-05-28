import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  showSuccessModal: vi.fn(),
  translateFeedback: vi.fn((key) => `translated:${key}`),
}))

vi.mock('../ui/feedback', () => ({
  notifyError: mocks.notifyError,
  notifySuccess: mocks.notifySuccess,
  showSuccessModal: mocks.showSuccessModal,
  translateFeedback: mocks.translateFeedback,
}))

import { handleTransactionFeedback } from './transactionFeedback'

describe('handleTransactionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('shows prefixed literal error messages by default', () => {
    const result = handleTransactionFeedback({ ok: false, message: 'rpc failed' })

    expect(result).toEqual({ ok: false, errorKey: 'common.txFailed', message: 'rpc failed' })
    expect(mocks.notifyError).toHaveBeenCalledWith('translated:common.txFailed rpc failed', {
      literal: true,
    })
  })

  it('can emit literal error messages without the shared prefix', () => {
    handleTransactionFeedback(
      { ok: false, message: 'raw backend message' },
      { prependErrorPrefix: false }
    )

    expect(mocks.notifyError).toHaveBeenCalledWith('raw backend message', { literal: true })
  })

  it('shows success toast and delayed success modal when txHash is present', () => {
    const result = handleTransactionFeedback(
      { ok: true, txHash: '0xabc' },
      { successMessageKey: 'sharedTx.txSentSuccess' }
    )

    expect(result).toEqual({ ok: true, txHash: '0xabc' })
    expect(mocks.notifySuccess).toHaveBeenCalledWith('sharedTx.txSentSuccess')

    vi.runAllTimers()

    expect(mocks.showSuccessModal).toHaveBeenCalledWith({
      title: 'common.transSentSuccess',
      content: 'Transaction hash: 0xabc',
    })
  })
})
