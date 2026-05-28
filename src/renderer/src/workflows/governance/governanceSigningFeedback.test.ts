import { beforeEach, describe, expect, it, vi } from 'vitest'

const feedbackMocks = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: feedbackMocks.notifyError,
  notifyWarning: feedbackMocks.notifyWarning,
}))

import { notifyGovernanceSigningFailure } from './governanceSigningFeedback'

describe('governanceSigningFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses warning feedback for warning-level signing failures', () => {
    const result = notifyGovernanceSigningFailure({
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })

    expect(result).toEqual({
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })
    expect(feedbackMocks.notifyWarning).toHaveBeenCalledWith('ledgerWallet.connectApp')
    expect(feedbackMocks.notifyError).not.toHaveBeenCalled()
  })

  it('uses error feedback and default fallback for other signing failures', () => {
    const result = notifyGovernanceSigningFailure({})

    expect(result).toEqual({ level: 'error', errorKey: 'common.networkErr' })
    expect(feedbackMocks.notifyError).toHaveBeenCalledWith('common.networkErr')
    expect(feedbackMocks.notifyWarning).not.toHaveBeenCalled()
  })
})
