import { describe, expect, it, vi } from 'vitest'

import { createTryCatch } from './tryCatch'

describe('createTryCatch', () => {
  it('applies default logger and error key to failures', async () => {
    const error = new Error('network down')
    const logger = { error: vi.fn() }
    const tryNetwork = createTryCatch({ errorKey: 'common.networkErr', logger })

    const result = await tryNetwork(
      async (): Promise<{ loaded: boolean }> => {
        throw error
      },
      {
        context: 'loadSomething',
        onFailure: () => ({ items: [] as string[] }),
      }
    )

    expect(result).toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      error,
      items: [],
      category: 'network',
    })
    expect(logger.error).toHaveBeenCalledWith('loadSomething', error)
  })

  it('falls back to the caller-provided key when the error is genuinely unknown', async () => {
    const logger = { error: vi.fn() }
    const tryNetwork = createTryCatch({ errorKey: 'common.networkErr', logger })

    const result = await tryNetwork(
      async (): Promise<{ saved: boolean }> => {
        throw new Error('save failed')
      },
      { context: 'saveSomething', errorKey: 'common.savedbFailed' }
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorKey).toBe('common.savedbFailed')
      expect(result.category).toBe('unknown')
    }
  })

  it('classifier wins over the caller hint when it can identify the error', async () => {
    const logger = { error: vi.fn() }
    const tryNetwork = createTryCatch({ errorKey: 'common.networkErr', logger })

    const result = await tryNetwork(
      async (): Promise<{ saved: boolean }> => {
        throw new Error('HTTP 503')
      },
      { context: 'loadSomething', errorKey: 'common.unexpectedError' }
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorKey).toBe('common.serverError')
      expect(result.category).toBe('network')
      expect(result.code).toBe('network.server_error')
    }
  })
})
