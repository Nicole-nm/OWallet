import { describe, expect, it, vi } from 'vitest'

import { tryCreateTransaction } from './transactionHelper'

const logger = { error: vi.fn() }

describe('tryCreateTransaction', () => {
  it('returns a draft transaction when the action succeeds', async () => {
    const tx = { hash: 'tx' }

    const result = await tryCreateTransaction({
      action: async () => tx,
      errorContext: 'createTx',
      logger,
    })

    expect(result).toEqual({ ok: true, tx })
  })

  it('logs failures and returns the default network error key', async () => {
    const error = new Error('boom')

    const result = await tryCreateTransaction({
      action: async () => {
        throw error
      },
      errorContext: 'createTx',
      logger,
    })

    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr', error })
    expect(logger.error).toHaveBeenCalledWith('createTx', error)
  })

  it('allows callers to provide a custom error key', async () => {
    const result = await tryCreateTransaction({
      action: async () => {
        throw new Error('nope')
      },
      errorContext: 'createCustomTx',
      logger,
      errorKey: 'custom.err',
    })

    expect(result).toMatchObject({ ok: false, errorKey: 'custom.err' })
  })
})
