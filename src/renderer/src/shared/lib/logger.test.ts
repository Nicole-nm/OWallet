import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLogger, logger } from './logger'

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('writes unscoped logs with the default prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.error('boom')

    expect(spy).toHaveBeenCalledWith('[OWallet]', 'boom')
  })

  it('writes scoped logs with nested detail context', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scopedLogger = createLogger('wallets')

    scopedLogger.warn('refresh', 'failed', { code: 500 })

    expect(spy).toHaveBeenCalledWith('[OWallet][wallets.refresh]', 'failed', { code: 500 })
  })

  it('writes scoped error payloads without requiring a detail key', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const scopedLogger = createLogger('httpClient')
    const error = new Error('network')

    scopedLogger.error(error)

    expect(spy).toHaveBeenCalledWith('[OWallet][httpClient]', error)
  })
})
