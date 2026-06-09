import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendTx: vi.fn(),
}))

vi.mock('./broadcast', () => ({
  sendTx: (...args: unknown[]) => mocks.sendTx(...args),
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: (value: string) => `rev:${value}`,
}))

import { sendTransaction } from './transactionDomainService'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'
import type { SdkTransactionLike } from '../../shared/chain/types'

function makeTx(id: string): SdkTransactionLike {
  return createFakeTransaction({ getHash: vi.fn(() => id) })
}

describe('sendTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok with reversed tx hash on Error=0 response', async () => {
    mocks.sendTx.mockResolvedValue({ Error: 0, Result: 'ok' })

    await expect(sendTransaction(makeTx('abc'))).resolves.toEqual({
      ok: true,
      response: { Error: 0, Result: 'ok' },
      txHash: 'rev:abc',
    })
  })

  it('does not treat a bare Error=-1 response as an ONG balance error', async () => {
    mocks.sendTx.mockResolvedValue({ Error: -1, Result: 'detail' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'detail',
      detail: 'detail',
    })
  })

  it('maps cover gas cost responses to ongNoEnough', async () => {
    mocks.sendTx.mockResolvedValue({ Error: 1, Result: 'not enough to cover gas cost' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'not enough to cover gas cost',
    })
  })

  it('maps balance insufficient responses to balanceInsufficient', async () => {
    mocks.sendTx.mockResolvedValue({ Error: 2, Result: 'balance insufficient for this transfer' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.balanceInsufficient',
      detail: 'balance insufficient for this transfer',
    })
  })

  it('returns generic failure with the response detail when no known pattern matches', async () => {
    mocks.sendTx.mockResolvedValue({ Error: 99, Result: 'mystery' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'mystery',
      detail: 'mystery',
    })
  })

  it('catches thrown errors and returns the message in the failure result', async () => {
    mocks.sendTx.mockRejectedValue(new Error('boom'))

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({ ok: false, message: 'boom' })
  })

  it('returns a generic failure when no response is returned', async () => {
    mocks.sendTx.mockResolvedValue(null)
    const result = await sendTransaction(makeTx('x'))
    expect(result).toMatchObject({ ok: false, message: null, detail: '' })
  })

  it('stringifies non-Error throwables in the failure message', async () => {
    mocks.sendTx.mockRejectedValue('plain rejection')
    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'plain rejection',
    })
  })
})
