import { describe, it, expect, vi } from 'vitest'
import { mapTransactionFailureResponse, tryCreateTransaction } from './transactionResults'

describe('mapTransactionFailureResponse()', () => {
  it('maps a gas-cost failure to the insufficient-ONG key', () => {
    expect(mapTransactionFailureResponse({ Result: 'can not cover gas cost' })).toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'can not cover gas cost',
    })
  })

  it('maps a balance-insufficient failure to the balance key', () => {
    expect(mapTransactionFailureResponse({ Result: 'balance insufficient' })).toEqual({
      ok: false,
      errorKey: 'common.balanceInsufficient',
      detail: 'balance insufficient',
    })
  })

  it('falls back to the raw detail as a message', () => {
    expect(mapTransactionFailureResponse({ Result: 'something else' })).toEqual({
      ok: false,
      message: 'something else',
      detail: 'something else',
    })
  })

  it('returns a null message when there is no detail', () => {
    expect(mapTransactionFailureResponse(null)).toEqual({ ok: false, message: null, detail: '' })
  })
})

describe('tryCreateTransaction()', () => {
  it('returns the built transaction on success', async () => {
    const logger = { error: vi.fn() }
    await expect(
      tryCreateTransaction({ action: async () => 'tx', errorContext: 'ctx', logger })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs and returns a failure Result when the action throws', async () => {
    const logger = { error: vi.fn() }
    const error = new Error('boom')

    await expect(
      tryCreateTransaction({
        action: async () => {
          throw error
        },
        errorContext: 'ctx',
        logger,
        errorKey: 'common.customErr',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.customErr', error })
    expect(logger.error).toHaveBeenCalledWith('ctx', error)
  })

  it('defaults the error key to the network error', async () => {
    const logger = { error: vi.fn() }
    const result = await tryCreateTransaction({
      action: async () => {
        throw new Error('x')
      },
      errorContext: 'ctx',
      logger,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr' })
  })
})
