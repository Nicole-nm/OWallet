import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sharedWalletService: {
    countSerializedSharedTransactionSignatures: vi.fn(),
    createSerializedSharedInvokeTransaction: vi.fn(),
    prepareSharedTransferDraft: vi.fn(),
    sendSerializedSharedTransaction: vi.fn(),
    signSerializedSharedTransaction: vi.fn(),
    signSharedTransactionDraft: vi.fn(),
    submitCreatedSharedTransfer: vi.fn(),
    submitPendingSharedSignature: vi.fn(),
  },
  walletAccountService: {
    validateWalletAddress: vi.fn(),
  },
}))

vi.mock('../../../../domains/sharedWallet/sharedWalletDomainService', () => ({
  countSerializedSharedTransactionSignatures: (...args: any[]) =>
    mocks.sharedWalletService.countSerializedSharedTransactionSignatures(...args),
  createSerializedSharedInvokeTransaction: (...args: any[]) =>
    mocks.sharedWalletService.createSerializedSharedInvokeTransaction(...args),
  prepareSharedTransferDraft: (...args: any[]) =>
    mocks.sharedWalletService.prepareSharedTransferDraft(...args),
  sendSerializedSharedTransaction: (...args: any[]) =>
    mocks.sharedWalletService.sendSerializedSharedTransaction(...args),
  signSerializedSharedTransaction: (...args: any[]) =>
    mocks.sharedWalletService.signSerializedSharedTransaction(...args),
  signSharedTransactionDraft: (...args: any[]) =>
    mocks.sharedWalletService.signSharedTransactionDraft(...args),
  submitCreatedSharedTransfer: (...args: any[]) =>
    mocks.sharedWalletService.submitCreatedSharedTransfer(...args),
  submitPendingSharedSignature: (...args: any[]) =>
    mocks.sharedWalletService.submitPendingSharedSignature(...args),
}))

vi.mock('../../../../domains/wallet/accountService', () => ({
  validateWalletAddress: (...args: any[]) =>
    mocks.walletAccountService.validateWalletAddress(...args),
}))

import {
  countSerializedSharedTransactionSignatures,
  createAndSubmitSharedTransfer,
  createSerializedSharedInvokeTransaction,
  sendSerializedSharedTransaction,
  signSerializedSharedTransaction,
  submitPendingSharedTransferSignature,
  validateSharedTransferAddress,
} from './sharedWalletTransactionApplicationService'
import type { PendingSharedTransfer, SharedWalletSession } from '../../../../shared/types'

function makeSharedWallet(overrides: Partial<SharedWalletSession> = {}): SharedWalletSession {
  return {
    sharedWalletAddress: 'AS123',
    sharedWalletName: 'Shared Wallet',
    coPayers: [],
    requiredNumber: 1,
    totalNumber: 1,
    ...overrides,
  }
}

import {
  createFakeSharedSigner,
  createFakePendingTransfer,
} from '../../../../shared/chain/__fixtures__/fakeWallet'

const makeSigner = createFakeSharedSigner

function makePendingTransfer(
  overrides: Partial<PendingSharedTransfer> = {}
): PendingSharedTransfer {
  return createFakePendingTransfer({
    sendaddress: 'AQ1',
    transactionbodyhash: 'body',
    transactionidhash: 'txid',
    ...overrides,
  })
}

describe('sharedWalletTransactionApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates transfer addresses through the wallet domain service', async () => {
    mocks.walletAccountService.validateWalletAddress.mockResolvedValue(true)

    await expect(validateSharedTransferAddress('AQ123')).resolves.toBe(true)
    expect(mocks.walletAccountService.validateWalletAddress).toHaveBeenCalledWith('AQ123')
  })

  it('creates and submits shared transfers after signing the prepared draft', async () => {
    const draft = { tx: 'draft-tx', gasLimit: '20000', gasPrice: '500', tokenType: 'ONT' }
    const signedTx = 'signed-tx'
    const response = { ok: true, txHash: 'hash-1' }

    mocks.sharedWalletService.prepareSharedTransferDraft.mockResolvedValue(draft)
    mocks.sharedWalletService.signSharedTransactionDraft.mockResolvedValue(signedTx)
    mocks.sharedWalletService.submitCreatedSharedTransfer.mockResolvedValue(response)

    await expect(
      createAndSubmitSharedTransfer({
        network: 'testnet',
        sharedWallet: makeSharedWallet(),
        transfer: { coPayers: [{ address: 'AQ1' }] },
        redeem: { claimableOng: 0 },
        sponsorWallet: makeSigner(),
        password: 'secret123',
      })
    ).resolves.toEqual(response)

    expect(mocks.sharedWalletService.signSharedTransactionDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        tx: 'draft-tx',
        password: 'secret123',
        isFirstSign: true,
        adapter: expect.objectContaining({
          identity: expect.objectContaining({ type: 'shared' }),
          capabilities: expect.objectContaining({ multiSignature: true }),
        }),
      })
    )
    expect(mocks.sharedWalletService.submitCreatedSharedTransfer).toHaveBeenCalledWith({
      network: 'testnet',
      sharedWallet: makeSharedWallet(),
      transfer: { coPayers: [{ address: 'AQ1' }] },
      payers: [{ address: 'AQ1' }],
      draft: {
        ...draft,
        tx: signedTx,
      },
    })
  })

  it('maps common-wallet signing failures to a password error', async () => {
    mocks.sharedWalletService.prepareSharedTransferDraft.mockResolvedValue({ tx: 'draft-tx' })
    mocks.sharedWalletService.signSharedTransactionDraft.mockResolvedValue(null)

    await expect(
      createAndSubmitSharedTransfer({
        network: 'testnet',
        sharedWallet: makeSharedWallet(),
        transfer: { coPayers: [] },
        redeem: {},
        sponsorWallet: makeSigner(),
        password: 'wrong-password',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.pwdErr' })
  })

  it('returns a cancelled result when the hardware-wallet signing step is aborted', async () => {
    mocks.sharedWalletService.prepareSharedTransferDraft.mockResolvedValue({ tx: 'draft-tx' })
    mocks.sharedWalletService.signSharedTransactionDraft.mockResolvedValue(null)

    await expect(
      createAndSubmitSharedTransfer({
        network: 'testnet',
        sharedWallet: makeSharedWallet(),
        transfer: { coPayers: [] },
        redeem: {},
        sponsorWallet: makeSigner({ type: 'HardwareWallet' }),
        password: '',
      })
    ).resolves.toEqual({ ok: false, cancelled: true })
  })

  it('delegates serialized transaction helpers to the shared wallet domain service', async () => {
    mocks.sharedWalletService.signSerializedSharedTransaction.mockResolvedValue({
      ok: true,
      serializedTx: 'signed',
    })
    mocks.sharedWalletService.createSerializedSharedInvokeTransaction.mockResolvedValue('invoke-tx')
    mocks.sharedWalletService.countSerializedSharedTransactionSignatures.mockResolvedValue(2)
    mocks.sharedWalletService.sendSerializedSharedTransaction.mockResolvedValue({
      ok: true,
      txHash: 'hash-2',
    })
    mocks.sharedWalletService.submitPendingSharedSignature.mockResolvedValue({ ok: true })

    await expect(
      signSerializedSharedTransaction({
        serializedTx: 'draft',
        sharedWallet: makeSharedWallet(),
        wallet: makeSigner(),
      })
    ).resolves.toEqual({
      ok: true,
      serializedTx: 'signed',
    })
    await expect(
      createSerializedSharedInvokeTransaction({
        sharedWalletAddress: 'AS123',
        contractHash: 'hash',
        method: 'foo',
        parameters: '[]',
      })
    ).resolves.toBe('invoke-tx')
    await expect(countSerializedSharedTransactionSignatures('serialized')).resolves.toBe(2)
    await expect(sendSerializedSharedTransaction('serialized')).resolves.toEqual({
      ok: true,
      txHash: 'hash-2',
    })
    await expect(
      submitPendingSharedTransferSignature({
        network: 'testnet',
        pendingTx: makePendingTransfer({ transactionbodyhash: 'body' }),
        sharedWallet: {
          address: 'AS123',
          label: 'multi',
          publicKey: '',
          sharedWalletAddress: 'AS123',
          sharedWalletName: 'multi',
          requiredNumber: '2',
          totalNumber: '3',
          coPayers: [
            { name: 'a', address: 'a', publickey: 'pk1' },
            { name: 'b', address: 'b', publickey: 'pk2' },
            { name: 'c', address: 'c', publickey: 'pk3' },
          ],
        },
        currentSigner: makeSigner({ address: 'AQ123' }),
      })
    ).resolves.toEqual({ ok: true })
  })
})
