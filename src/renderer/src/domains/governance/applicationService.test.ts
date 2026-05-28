import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionBuilder: {
    buildAddInitPos: vi.fn(),
    buildAuthorizeForPeer: vi.fn(),
    buildChangeAuthorization: vi.fn(),
    buildQuitNode: vi.fn(),
    buildReduceInitPos: vi.fn(),
    buildRegisterCandidate: vi.fn(),
    buildSetFeePercentage: vi.fn(),
    buildUnauthorizeForPeer: vi.fn(),
    buildUnregisterCandidate: vi.fn(),
    buildWithdraw: vi.fn(),
    buildWithdrawFee: vi.fn(),
    buildWithdrawPeerUnboundOng: vi.fn(),
  },
}))

vi.mock('./transactionBuilder', () => mocks.transactionBuilder)

import {
  createRegisterCandidateTransaction,
  createSetFeePercentageTransaction,
} from './applicationService'

describe('governance applicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps candidate registration inputs to the governance transaction builder', async () => {
    mocks.transactionBuilder.buildRegisterCandidate.mockResolvedValue('register-tx')

    await expect(
      createRegisterCandidateTransaction({
        ontid: 'did:ont:stake-wallet',
        publicKey: 'node-public-key',
        initPos: 10000,
        stakeWalletAddress: 'stake-wallet',
      })
    ).resolves.toBe('register-tx')

    expect(mocks.transactionBuilder.buildRegisterCandidate).toHaveBeenCalledWith(
      'did:ont:stake-wallet',
      'node-public-key',
      1,
      'stake-wallet',
      10000,
      'stake-wallet'
    )
  })

  it('uses the stake wallet as payer when setting node fee percentages', async () => {
    mocks.transactionBuilder.buildSetFeePercentage.mockResolvedValue('fee-tx')

    await expect(
      createSetFeePercentageTransaction({
        nodePublicKey: 'node-public-key',
        stakeWalletAddress: 'stake-wallet',
        peerCost: 10,
        stakeCost: 20,
      })
    ).resolves.toBe('fee-tx')

    expect(mocks.transactionBuilder.buildSetFeePercentage).toHaveBeenCalledWith(
      'node-public-key',
      'stake-wallet',
      10,
      20,
      'stake-wallet'
    )
  })
})
