import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  notifyFailure: vi.fn(),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: mocks.notifyFailure,
}))

import { notifyGovernanceSigningFailure } from './governanceSigningFeedback'

describe('governanceSigningFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards a warning-level signing failure through notifyFailure', () => {
    const result = notifyGovernanceSigningFailure({
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })

    expect(result).toEqual({
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })
    expect(mocks.notifyFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        level: 'warning',
        errorKey: 'ledgerWallet.connectApp',
      }),
      'common.unexpectedError'
    )
  })

  it('defaults to common.unexpectedError instead of misleading network error when no key is supplied', () => {
    const result = notifyGovernanceSigningFailure({})

    expect(result).toEqual({ level: 'error', errorKey: 'common.unexpectedError' })
    expect(mocks.notifyFailure).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
      'common.unexpectedError'
    )
  })

  it('uses the category default key when the result carries a classified category', () => {
    const result = notifyGovernanceSigningFailure({
      category: 'cancelled',
      code: 'signing.user_rejected',
    })

    expect(result).toEqual({ level: 'error', errorKey: 'common.rejectedByUser' })
    expect(mocks.notifyFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        category: 'cancelled',
        code: 'signing.user_rejected',
      }),
      'common.rejectedByUser'
    )
  })

  it('honours an explicit fallback over the category default', () => {
    const result = notifyGovernanceSigningFailure(
      { category: 'cancelled' },
      'governance.txCancelled'
    )

    expect(result.errorKey).toBe('governance.txCancelled')
    expect(mocks.notifyFailure).toHaveBeenCalledWith(expect.anything(), 'governance.txCancelled')
  })
})
