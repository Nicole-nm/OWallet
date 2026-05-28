import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionService: {
    sendTransaction: vi.fn(),
    signLedgerPayload: vi.fn(),
    signPayload: vi.fn(),
  },
}))

vi.mock('../../../domains/transaction/applicationService', () => ({
  sendTransaction: (...args: any[]) => mocks.transactionService.sendTransaction(...args),
  signLedgerPayload: (...args: any[]) => mocks.transactionService.signLedgerPayload(...args),
  signPayload: (...args: any[]) => mocks.transactionService.signPayload(...args),
}))

import {
  signGovernancePayload,
  submitGovernanceSignedTransaction,
} from './governanceSigningApplicationService'

function makeTx(hash: string) {
  return {
    hash,
    serializeUnsignedData: vi.fn(() => 'unsigned'),
    serialize: vi.fn(() => 'serialized'),
    getHash: vi.fn(() => hash),
  }
}

describe('governanceSigningApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a password for software wallet signing', async () => {
    await expect(
      signGovernancePayload({
        payload: 'payload',
        wallet: { key: 'encrypted', address: 'AQ123' },
        password: '',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'nodeStake.passwordEmpty',
    })
  })

  it('maps software-wallet signing without a signature to a password error', async () => {
    mocks.transactionService.signPayload.mockResolvedValue(undefined)

    await expect(
      signGovernancePayload({
        payload: 'payload',
        wallet: { key: 'encrypted', address: 'AQ123' },
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
  })

  it('blocks ledger signing when the device is disconnected and maps ledger failures', async () => {
    await expect(
      signGovernancePayload({
        payload: 'payload',
        wallet: { address: 'AQ123', publicKey: 'pk-1' },
        ledgerConnected: false,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })

    mocks.transactionService.signLedgerPayload.mockRejectedValue(new Error('ledger failed'))

    await expect(
      signGovernancePayload({
        payload: 'payload',
        wallet: { address: 'AQ123', publicKey: 'pk-1' },
        ledgerConnected: true,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'ledgerWallet.signFailed',
      error: expect.any(Error),
    })
  })

  it('returns a signed payload when wallet signing succeeds', async () => {
    mocks.transactionService.signPayload.mockResolvedValue('signed')

    await expect(
      signGovernancePayload({
        payload: 'payload',
        wallet: { key: 'encrypted', address: 'AQ123' },
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: true,
      signedPayload: 'signed',
    })
  })

  it('passes through transaction submission results and wraps thrown send failures', async () => {
    mocks.transactionService.sendTransaction.mockResolvedValue({ ok: true, txHash: 'hash' })

    await expect(
      submitGovernanceSignedTransaction({
        tx: makeTx('tx'),
      })
    ).resolves.toEqual({
      ok: true,
      txHash: 'hash',
    })

    mocks.transactionService.sendTransaction.mockRejectedValue(new Error('network failed'))

    await expect(
      submitGovernanceSignedTransaction({
        tx: makeTx('tx'),
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error: expect.any(Error),
    })
  })
})
