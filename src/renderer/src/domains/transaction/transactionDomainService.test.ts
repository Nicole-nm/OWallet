import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signingService: {
    sendTx: vi.fn(),
  },
}))

vi.mock('./signingService', () => ({
  sendTx: (...args: any[]) => mocks.signingService.sendTx(...args),
}))

vi.mock('./serializationService', () => ({
  serializeTx: vi.fn(),
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: (value: string) => `rev:${value}`,
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  signTransactionWithPrivateKey: vi.fn(),
  tryDecryptWallet: vi.fn(),
}))

vi.mock('./assetBuilder', () => ({
  buildClaimOng: vi.fn(),
  buildNativeTransfer: vi.fn(),
  buildOep4Transfer: vi.fn(),
}))

import { sendTransaction } from './transactionDomainService'

function makeTx(id: string) {
  return {
    getHash: () => id,
  } as any
}

describe('transactionApplicationService.sendTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok with reversed tx hash on Error=0 response', async () => {
    mocks.signingService.sendTx.mockResolvedValue({ Error: 0, Result: 'ok' })

    await expect(sendTransaction(makeTx('abc'))).resolves.toEqual({
      ok: true,
      response: { Error: 0, Result: 'ok' },
      txHash: 'rev:abc',
    })
  })

  it('maps Error=-1 response to ongNoEnough error key', async () => {
    mocks.signingService.sendTx.mockResolvedValue({ Error: -1, Result: 'detail' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'detail',
    })
  })

  it('maps cover gas cost responses to ongNoEnough', async () => {
    mocks.signingService.sendTx.mockResolvedValue({
      Error: 1,
      Result: 'not enough to cover gas cost',
    })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'not enough to cover gas cost',
    })
  })

  it('maps balance insufficient responses to balanceInsufficient', async () => {
    mocks.signingService.sendTx.mockResolvedValue({
      Error: 2,
      Result: 'balance insufficient for this transfer',
    })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.balanceInsufficient',
      detail: 'balance insufficient for this transfer',
    })
  })

  it('returns generic failure with the response detail when no known pattern matches', async () => {
    mocks.signingService.sendTx.mockResolvedValue({ Error: 99, Result: 'mystery' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'mystery',
      detail: 'mystery',
    })
  })

  it('catches thrown errors and returns the message in the failure result', async () => {
    mocks.signingService.sendTx.mockRejectedValue(new Error('boom'))

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'boom',
    })
  })
})
