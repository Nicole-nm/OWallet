import { beforeEach, describe, expect, it, vi } from 'vitest'

import { configureRuntimeFeedback, hideRuntimeLoading, showRuntimeLoading } from './runtimeFeedback'

describe('runtimeFeedback', () => {
  beforeEach(() => {
    configureRuntimeFeedback()
  })

  it('invokes configured loading handlers', () => {
    const showLoading = vi.fn()
    const hideLoading = vi.fn()

    configureRuntimeFeedback({ showLoading, hideLoading })

    showRuntimeLoading()
    hideRuntimeLoading()

    expect(showLoading).toHaveBeenCalledTimes(1)
    expect(hideLoading).toHaveBeenCalledTimes(1)
  })

  it('falls back to no-op handlers when reset without callbacks', () => {
    expect(() => {
      showRuntimeLoading()
      hideRuntimeLoading()
    }).not.toThrow()
  })
})
