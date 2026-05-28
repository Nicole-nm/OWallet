import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionService: {
    createRedeemTransaction: vi.fn(),
    signAndSendTransaction: vi.fn(),
  },
}))

vi.mock('../../../domains/transaction/applicationService', () => ({
  createRedeemTransaction: (...args: any[]) =>
    mocks.transactionService.createRedeemTransaction(...args),
  signAndSendTransaction: (...args: any[]) =>
    mocks.transactionService.signAndSendTransaction(...args),
}))

import { submitWalletRedeem } from './commonRedeemApplicationService'

describe('commonRedeemApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and submits redeem transactions', async () => {
    const tx = { id: 'tx-1' }
    const result = { ok: true, txHash: 'hash-1' }
    mocks.transactionService.createRedeemTransaction.mockResolvedValue(tx)
    mocks.transactionService.signAndSendTransaction.mockResolvedValue(result)
    const wallet = {
      address: 'AQ123',
      label: 'Wallet',
      name: 'Wallet',
      key: 'encrypted-key',
      publicKey: 'pk',
      coPayers: [],
      requiredNumber: '1',
      totalNumber: '1',
    }

    await expect(
      submitWalletRedeem({
        wallet,
        claimableOng: '1',
        password: 'secret123',
      })
    ).resolves.toEqual(result)

    expect(mocks.transactionService.createRedeemTransaction).toHaveBeenCalled()
    expect(mocks.transactionService.signAndSendTransaction).toHaveBeenCalledWith({
      tx,
      wallet,
      password: 'secret123',
    })
  })
})
