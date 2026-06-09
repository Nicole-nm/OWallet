import { describe, expect, it, vi } from 'vitest'

import { tryResult } from './tryResult'

describe('tryResult', () => {
  it('wraps a successful op in success(data)', async () => {
    const result = await tryResult(async () => ({ value: 42 }), {
      context: 'loadValue',
      errorKey: 'common.networkErr',
    })

    expect(result).toEqual({ ok: true, data: { value: 42 } })
  })

  it('logs and returns failure with the caller error key on throw', async () => {
    const error = new Error('boom')
    const logger = { error: vi.fn() }

    const result = await tryResult(
      async (): Promise<number> => {
        throw error
      },
      { context: 'loadValue', errorKey: 'common.savedbFailed', logger }
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorKey).toBe('common.savedbFailed')
    }
    expect(logger.error).toHaveBeenCalledWith('loadValue', error)
  })

  it('uses the provided mapError for failure metadata', async () => {
    const mapError = vi.fn(() => ({ category: 'storage' as const, code: 'storage.unavailable' }))

    const result = await tryResult(
      async (): Promise<number> => {
        throw new Error('db gone')
      },
      { context: 'save', errorKey: 'common.savedbFailed', logger: { error: vi.fn() }, mapError }
    )

    expect(mapError).toHaveBeenCalled()
    if (!result.ok) {
      expect(result.category).toBe('storage')
      expect(result.code).toBe('storage.unavailable')
    }
  })
})
