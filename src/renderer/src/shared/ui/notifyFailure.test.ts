import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  messageError: vi.fn(),
  messageWarning: vi.fn(),
  messageSuccess: vi.fn(),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    error: mocks.messageError,
    warning: mocks.messageWarning,
    success: mocks.messageSuccess,
  },
  Modal: { success: vi.fn() },
}))

vi.mock('../../lang', () => ({
  default: {
    global: {
      t: (key: string) => `T(${key})`,
    },
  },
}))

import { notifyFailure } from './notifyFailure'

describe('shared/ui/notifyFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false and surfaces nothing when given a successful result', () => {
    const result = notifyFailure({ ok: true })

    expect(result).toBe(false)
    expect(mocks.messageError).not.toHaveBeenCalled()
    expect(mocks.messageWarning).not.toHaveBeenCalled()
  })

  it('returns false for null or undefined input (treats absence as no failure)', () => {
    expect(notifyFailure(null)).toBe(false)
    expect(notifyFailure(undefined)).toBe(false)
    expect(mocks.messageError).not.toHaveBeenCalled()
  })

  it('surfaces a failure with errorKey via notifyError (translated)', () => {
    const result = notifyFailure({ ok: false, errorKey: 'common.networkErr' })

    expect(result).toBe(true)
    expect(mocks.messageError).toHaveBeenCalledWith('T(common.networkErr)')
  })

  it('uses notifyWarning when result.level is "warning"', () => {
    const result = notifyFailure({ ok: false, errorKey: 'common.ongNoEnough', level: 'warning' })

    expect(result).toBe(true)
    expect(mocks.messageWarning).toHaveBeenCalledWith('T(common.ongNoEnough)')
    expect(mocks.messageError).not.toHaveBeenCalled()
  })

  it('falls back to the provided fallback key when errorKey is missing', () => {
    const result = notifyFailure({ ok: false }, 'common.savedbFailed')

    expect(result).toBe(true)
    expect(mocks.messageError).toHaveBeenCalledWith('T(common.savedbFailed)')
  })

  it('still returns true (signals failure) when there is no key and no fallback, without showing a toast', () => {
    const result = notifyFailure({ ok: false })

    expect(result).toBe(true)
    expect(mocks.messageError).not.toHaveBeenCalled()
    expect(mocks.messageWarning).not.toHaveBeenCalled()
  })

  it('prefers errorKey over the fallback key when both are provided', () => {
    notifyFailure({ ok: false, errorKey: 'specific.error' }, 'common.networkErr')

    expect(mocks.messageError).toHaveBeenCalledWith('T(specific.error)')
  })

  it('falls back to the category default when no errorKey is present', () => {
    const result = notifyFailure({ ok: false, category: 'timeout', code: 'timeout.request' })

    expect(result).toBe(true)
    expect(mocks.messageError).toHaveBeenCalledWith('T(common.requestTimeout)')
  })
})
