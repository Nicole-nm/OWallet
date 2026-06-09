import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionService: {
    buildClaimOng: vi.fn(),
    sendTransaction: vi.fn(),
  },
}))

vi.mock('../../../../domains/transaction/assetBuilder', () => ({
  buildClaimOng: (...args: any[]) => mocks.transactionService.buildClaimOng(...args),
}))

vi.mock('../../../../domains/transaction/transactionDomainService', () => ({
  sendTransaction: (...args: any[]) => mocks.transactionService.sendTransaction(...args),
}))

import { submitWalletRedeem } from './commonRedeemApplicationService'
import type { WalletAdapter, WalletCapabilities } from '../../../../domains/wallet/adapter'

const commonCapabilities: WalletCapabilities = {
  requiresPassword: true,
  requiresHardwareDevice: false,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

const ledgerCapabilities: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
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

describe('commonRedeemApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates, signs via adapter, and submits redeem transactions', async () => {
    const tx = { id: 'tx-1' }
    const signed = { id: 'signed-tx' }
    const submitResult = { ok: true, txHash: 'hash-1' }

    mocks.transactionService.buildClaimOng.mockResolvedValue(tx)
    mocks.transactionService.sendTransaction.mockResolvedValue(submitResult)

    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(
      submitWalletRedeem({ address: 'AQ123', adapter, claimableOng: '1', password: 'secret123' })
    ).resolves.toEqual(submitResult)

    expect(mocks.transactionService.buildClaimOng).toHaveBeenCalled()
    expect(adapter.signTransaction).toHaveBeenCalledWith(tx, { password: 'secret123' })
    expect(mocks.transactionService.sendTransaction).toHaveBeenCalledWith(signed)
  })

  it('maps null sign result to common.pwdErr when adapter requires password', async () => {
    mocks.transactionService.buildClaimOng.mockResolvedValue({ id: 'tx-1' })

    await expect(
      submitWalletRedeem({
        address: 'AQ123',
        adapter: makeAdapter(commonCapabilities, null),
        claimableOng: '1',
        password: 'wrong',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.pwdErr' })
    expect(mocks.transactionService.sendTransaction).not.toHaveBeenCalled()
  })

  it('creates ledger redeem transactions with the ledger default gas price', async () => {
    mocks.transactionService.buildClaimOng.mockResolvedValue({ id: 'tx-1' })
    mocks.transactionService.sendTransaction.mockResolvedValue({ ok: true, txHash: 'hash-1' })

    await submitWalletRedeem({
      address: 'AQ123',
      adapter: makeAdapter(ledgerCapabilities),
      claimableOng: '1',
    })

    expect(mocks.transactionService.buildClaimOng).toHaveBeenCalledWith(
      'AQ123',
      '1',
      '2500',
      '20000'
    )
  })
})
