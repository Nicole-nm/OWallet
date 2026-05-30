import { describe, expect, it, vi } from 'vitest'

import { mapSigningFailure, tryCreateTransaction } from './transactionHelper'

const logger = { error: vi.fn() }

describe('tryCreateTransaction', () => {
  it('returns the transaction on success', async () => {
    const result = await tryCreateTransaction({
      action: async () => 'tx',
      errorContext: 'ctx',
      logger,
    })
    expect(result).toEqual({ ok: true, tx: 'tx' })
  })

  it('logs and returns the default error key on failure', async () => {
    const error = new Error('boom')
    const result = await tryCreateTransaction({
      action: async () => {
        throw error
      },
      errorContext: 'ctx',
      logger,
    })
    expect(logger.error).toHaveBeenCalledWith('ctx', error)
    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr', error })
  })

  it('honours a custom error key', async () => {
    const result = await tryCreateTransaction({
      action: async () => {
        throw new Error('boom')
      },
      errorContext: 'ctx',
      logger,
      errorKey: 'custom.err',
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'custom.err' })
  })
})

describe('mapSigningFailure', () => {
  it('returns a password error when the wallet has a key', () => {
    expect(mapSigningFailure({ wallet: { key: 'k' } as never })).toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
  })

  it('honours a custom password error key', () => {
    expect(
      mapSigningFailure({ wallet: { key: 'k' } as never, passwordErrorKey: 'my.pwd' })
    ).toMatchObject({ errorKey: 'my.pwd' })
  })

  it('returns cancelled when the wallet has no key', () => {
    expect(mapSigningFailure({ wallet: null })).toEqual({ ok: false, cancelled: true })
    expect(mapSigningFailure({ wallet: {} as never })).toEqual({ ok: false, cancelled: true })
  })
})
