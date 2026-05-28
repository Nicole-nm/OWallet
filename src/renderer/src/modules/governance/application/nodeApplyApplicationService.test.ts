import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  governanceService: {
    createRegisterCandidateTransaction: vi.fn(),
  },
  accountService: {
    deriveAddressFromPublicKey: vi.fn(),
  },
  nodeStakeApplicationService: {
    createPendingNodeStakeInfo: vi.fn(),
  },
}))

vi.mock('../../../domains/governance/applicationService', () => ({
  createRegisterCandidateTransaction: (...args: unknown[]) =>
    mocks.governanceService.createRegisterCandidateTransaction(...args),
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  deriveAddressFromPublicKey: (...args: unknown[]) =>
    mocks.accountService.deriveAddressFromPublicKey(...args),
}))

vi.mock('./nodeStakeApplicationService', () => ({
  createPendingNodeStakeInfo: (...args: unknown[]) =>
    mocks.nodeStakeApplicationService.createPendingNodeStakeInfo(...args),
}))

import {
  createNodeApplyTransactionDraft,
  createPendingNodeApplyInfo,
  isNodeApplyAmountValid,
  validateNodeApplyForm,
  validateNodeApplyOperationWallet,
} from './nodeApplyApplicationService'

describe('nodeApplyApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates node apply amount and first-step form requirements', () => {
    expect(isNodeApplyAmountValid('10')).toBe(true)
    expect(isNodeApplyAmountValid('0.5')).toBe(false)

    expect(
      validateNodeApplyForm({
        stakeWalletAddress: '',
        operationWalletPublicKey: 'pk-1',
        stakeAmount: '10000',
      })
    ).toEqual({ ok: false, errorKey: 'nodeApply.stakeWalletRequired' })

    expect(
      validateNodeApplyForm({
        stakeWalletAddress: 'AQ123',
        operationWalletPublicKey: 'pk-1',
        stakeAmount: '100',
        minStakeAmount: 10000,
      })
    ).toEqual({ ok: false, errorKey: 'nodeApply.minStateAmount' })

    expect(
      validateNodeApplyForm({
        stakeWalletAddress: 'AQ123',
        operationWalletPublicKey: 'pk-1',
        stakeAmount: '10000',
        amountIsValid: false,
      })
    ).toEqual({ ok: false, silent: true })
  })

  it('validates the operation wallet against invalid and duplicate addresses', async () => {
    mocks.accountService.deriveAddressFromPublicKey.mockRejectedValueOnce(new Error('invalid pk'))

    await expect(
      validateNodeApplyOperationWallet({
        stakeWalletAddress: 'AQ123',
        operationWalletPublicKey: 'pk-1',
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'nodeApply.invalidOperationPk',
      error: expect.any(Error),
    })

    mocks.accountService.deriveAddressFromPublicKey.mockResolvedValueOnce('AQ123')

    await expect(
      validateNodeApplyOperationWallet({
        stakeWalletAddress: 'AQ123',
        operationWalletPublicKey: 'pk-1',
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'nodeApply.sameWalletNotAllowed',
      address: 'AQ123',
    })
  })

  it('creates a node apply registration transaction with the stake-wallet ontid', async () => {
    mocks.governanceService.createRegisterCandidateTransaction.mockResolvedValue('tx')

    await expect(
      createNodeApplyTransactionDraft({
        stakeWalletAddress: 'AQ123',
        operationWalletPublicKey: 'pk-1',
        stakeAmount: '10000',
      })
    ).resolves.toEqual({ ok: true, tx: 'tx' })

    expect(mocks.governanceService.createRegisterCandidateTransaction).toHaveBeenCalledWith({
      ontid: 'did:ontAQ123',
      publicKey: 'pk-1',
      initPos: 10000,
      stakeWalletAddress: 'AQ123',
    })
  })

  it('creates pending node info records with a stable default name', async () => {
    mocks.nodeStakeApplicationService.createPendingNodeStakeInfo.mockResolvedValue({ ok: true })

    await expect(
      createPendingNodeApplyInfo({
        network: 'TEST_NET',
        stakeWalletAddress: 'AQ123',
        nodePublicKey: 'abcdef123456',
      })
    ).resolves.toEqual({
      ok: true,
      nodePublicKey: 'abcdef123456',
    })

    expect(mocks.nodeStakeApplicationService.createPendingNodeStakeInfo).toHaveBeenCalledWith({
      network: 'TEST_NET',
      info: {
        name: 'Node_abcdef',
        address: 'AQ123',
        publicKey: 'abcdef123456',
      },
    })
  })
})
