import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionService: {
    createTransferTransaction: vi.fn(),
    signAndSendTransaction: vi.fn(),
  },
}))

vi.mock('../../../domains/transaction/applicationService', () => ({
  createTransferTransaction: (...args: any[]) =>
    mocks.transactionService.createTransferTransaction(...args),
  signAndSendTransaction: (...args: any[]) =>
    mocks.transactionService.signAndSendTransaction(...args),
}))

import { buildTransferGasPrice, submitCommonTransfer } from './commonTransferApplicationService'

const wallet = {
  address: 'AQ123',
  label: 'Test Wallet',
  name: 'Test Wallet',
  publicKey: 'public-key',
  coPayers: [],
  requiredNumber: '',
  totalNumber: '',
}

describe('commonTransferApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds gas prices from transfer fee boundaries', () => {
    expect(buildTransferGasPrice('0.01')).toBe('500')
    expect(buildTransferGasPrice('0.02')).toBe('1000')
  })

  it('creates, signs, and sends transfer transactions', async () => {
    const tx = { id: 'tx-1' }
    const result = { ok: true, txHash: 'hash-1' }

    mocks.transactionService.createTransferTransaction.mockResolvedValue(tx)
    mocks.transactionService.signAndSendTransaction.mockResolvedValue(result)

    await expect(
      submitCommonTransfer({
        wallet,
        transfer: {
          asset: 'ONT',
          to: 'AQ999',
          amount: 1,
          gas: 0.02,
        },
        password: 'secret123',
      })
    ).resolves.toEqual(result)

    expect(mocks.transactionService.createTransferTransaction).toHaveBeenCalledWith({
      fromAddress: 'AQ123',
      transfer: {
        asset: 'ONT',
        to: 'AQ999',
        amount: 1,
        gas: 0.02,
        gasPrice: '1000',
        gasLimit: '20000',
      },
    })
    expect(mocks.transactionService.signAndSendTransaction).toHaveBeenCalledWith({
      tx,
      wallet,
      password: 'secret123',
    })
  })
})
