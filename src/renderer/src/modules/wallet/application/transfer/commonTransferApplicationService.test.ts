import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionService: {
    buildTransfer: vi.fn(),
    sendTransaction: vi.fn(),
  },
}))

vi.mock('../../../../domains/transaction/assetBuilder', () => ({
  buildTransfer: (...args: any[]) => mocks.transactionService.buildTransfer(...args),
}))

vi.mock('../../../../domains/transaction/transactionDomainService', () => ({
  sendTransaction: (...args: any[]) => mocks.transactionService.sendTransaction(...args),
}))

import { buildTransferGasPrice, submitCommonTransfer } from './commonTransferApplicationService'
import type { WalletAdapter, WalletCapabilities } from '../../../../domains/wallet/adapter'

const commonCapabilities: WalletCapabilities = {
  requiresPassword: true,
  requiresHardwareDevice: false,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

function makeAdapter(
  capabilities: WalletCapabilities = commonCapabilities,
  signResult: unknown = 'signed-tx'
): WalletAdapter {
  return {
    identity: {
      type: capabilities.requiresPassword ? 'common' : 'ledger',
      address: 'AQ123',
      publicKey: 'pk',
      label: 'L',
    },
    capabilities,
    signTransaction: vi.fn().mockResolvedValue(signResult),
    signMessage: vi.fn(),
    addSignature: vi.fn(),
  } as WalletAdapter
}

describe('commonTransferApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds gas prices from transfer fee boundaries', () => {
    expect(buildTransferGasPrice('0.01')).toBe('500')
    expect(buildTransferGasPrice('0.02')).toBe('1000')
  })

  it('creates, signs via adapter, and sends transfer transactions', async () => {
    const tx = { id: 'tx-1' }
    const signed = { id: 'signed-tx' }
    const submitResult = { ok: true, txHash: 'hash-1' }

    mocks.transactionService.buildTransfer.mockResolvedValue(tx)
    mocks.transactionService.sendTransaction.mockResolvedValue(submitResult)

    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(
      submitCommonTransfer({
        address: 'AQ123',
        adapter,
        transfer: { asset: 'ONT', to: 'AQ999', amount: 1, gas: 0.02 },
        password: 'secret123',
      })
    ).resolves.toEqual(submitResult)

    expect(mocks.transactionService.buildTransfer).toHaveBeenCalledWith(
      { asset: 'ONT', to: 'AQ999', amount: 1, gas: 0.02, gasPrice: '1000', gasLimit: '20000' },
      'AQ123'
    )
    expect(adapter.signTransaction).toHaveBeenCalledWith(tx, { password: 'secret123' })
    expect(mocks.transactionService.sendTransaction).toHaveBeenCalledWith(signed)
  })

  it('maps null sign result to common.pwdErr when adapter requires password', async () => {
    mocks.transactionService.buildTransfer.mockResolvedValue({ id: 'tx-1' })

    await expect(
      submitCommonTransfer({
        address: 'AQ123',
        adapter: makeAdapter(commonCapabilities, null),
        transfer: { asset: 'ONT', to: 'AQ999', amount: 1, gas: 0.02 },
        password: 'wrong',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.pwdErr' })
    expect(mocks.transactionService.sendTransaction).not.toHaveBeenCalled()
  })
})
