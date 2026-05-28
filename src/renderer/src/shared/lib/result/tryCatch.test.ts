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

    expect(result).toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error,
      items: [],
    })
    expect(logger.error).toHaveBeenCalledWith('loadSomething', error)
  })

  it('allows callers to override a default error key', async () => {
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
    }
  })
})
