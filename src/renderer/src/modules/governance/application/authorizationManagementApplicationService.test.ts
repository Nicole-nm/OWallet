import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  governanceService: {
    createAuthorizationTransaction: vi.fn(),
    createUnauthorizationTransaction: vi.fn(),
    createWithdrawAuthorizationTransaction: vi.fn(),
    createWithdrawFeeTransaction: vi.fn(),
    createWithdrawPeerUnboundOngTransaction: vi.fn(),
  },
}))

vi.mock('../../../domains/governance/applicationService', () => ({
  createAuthorizationTransaction: (...args: unknown[]) =>
    mocks.governanceService.createAuthorizationTransaction(...args),
  createUnauthorizationTransaction: (...args: unknown[]) =>
    mocks.governanceService.createUnauthorizationTransaction(...args),
  createWithdrawAuthorizationTransaction: (...args: unknown[]) =>
    mocks.governanceService.createWithdrawAuthorizationTransaction(...args),
  createWithdrawFeeTransaction: (...args: unknown[]) =>
    mocks.governanceService.createWithdrawFeeTransaction(...args),
  createWithdrawPeerUnboundOngTransaction: (...args: unknown[]) =>
    mocks.governanceService.createWithdrawPeerUnboundOngTransaction(...args),
}))

import {
  canOpenNewAuthorization,
  createAuthorizationClaimableOntRedeemTransaction,
  createAuthorizationRewardsRedeemTransaction,
  createAuthorizationUnboundOngRedeemTransaction,
  createCancelAuthorizationTransaction,
  createNewAuthorizationTransaction,
  resolveNewAuthorizationInput,
  validateCancelAuthorizationAmount,
} from './authorizationManagementApplicationService'
import type { GovernanceNode } from '../../../shared/types'

function makeGovernanceNode(overrides: Partial<GovernanceNode> = {}): GovernanceNode {
  const publicKey = String(
    overrides.publicKey ||
      overrides.public_key ||
      overrides.publickey ||
      overrides.peerPubkey ||
      overrides.pk ||
      'pk-1'
  )
  return {
    pk: publicKey,
    peerPubkey: publicKey,
    publicKey,
    nodePublicKey: publicKey,
    public_key: publicKey,
    publickey: publicKey,
    name: 'Node 1',
    nodeAddress: 'AQNODE',
    maxAuthorize: 20,
    maxAuthorizeStr: '20',
    totalPos: 5,
    totalPosStr: '5',
    ...overrides,
  }
}

describe('authorizationManagementApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates new authorization unit input against available capacity', () => {
    expect(
      resolveNewAuthorizationInput({
        units: '0.5',
        currentNode: { maxAuthorize: 20, totalPos: 5 },
      })
    ).toEqual({
      ok: false,
      validInput: false,
      amount: 0,
      errorKey: 'nodeMgmt.invalidInput',
    })

    expect(
      resolveNewAuthorizationInput({
        units: '20',
        currentNode: { maxAuthorize: 20, totalPos: 5 },
      })
    ).toEqual({
      ok: false,
      validInput: false,
      amount: 20,
      errorKey: 'nodeMgmt.invalidInput',
    })
  })

  it('gates opening a new authorization page and creates the authorization draft', async () => {
    expect(canOpenNewAuthorization({ peerAttrs: { maxAuthorize: 0 } })).toEqual({
      ok: false,
      errorKey: 'nodeMgmt.peerNotAllowAuthorize',
      level: 'warning',
    })

    mocks.governanceService.createAuthorizationTransaction.mockResolvedValue('tx')

    await expect(
      createNewAuthorizationTransaction({
        currentNode: makeGovernanceNode({ public_key: 'pk-1' }),
        stakeWalletAddress: 'AQ123',
        amount: 10,
      })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })

  it('validates cancel authorization input and creates the transaction draft', async () => {
    expect(
      validateCancelAuthorizationAmount({
        cancelAmount: '50',
        authorizationInfo: { consensusPos: 10, freezePos: 10, newPos: 10 },
      })
    ).toEqual({
      ok: false,
      validCancelAmount: false,
      errorKey: 'nodeMgmt.invalidInput',
    })

    mocks.governanceService.createUnauthorizationTransaction.mockResolvedValue('tx')

    await expect(
      createCancelAuthorizationTransaction({
        currentNode: makeGovernanceNode({ publickey: 'pk-1' }),
        stakeWalletAddress: 'AQ123',
        cancelAmount: '20',
        authorizationInfo: { consensusPos: 10, freezePos: 10, newPos: 10 },
      })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })

  it('returns warning results for empty rewards and unbound ong redeems', async () => {
    await expect(
      createAuthorizationRewardsRedeemTransaction({
        stakeWalletAddress: 'AQ123',
        amount: 0,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'nodeMgmt.noRewards',
      level: 'warning',
    })

    await expect(
      createAuthorizationUnboundOngRedeemTransaction({
        stakeWalletAddress: 'AQ123',
        amount: 0,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'nodeMgmt.noUnboundOng',
      level: 'warning',
    })
  })

  it('creates claimable ont redemption only when withdrawable balance exists', async () => {
    await expect(
      createAuthorizationClaimableOntRedeemTransaction({
        currentNode: makeGovernanceNode({ publicKey: 'pk-1' }),
        stakeWalletAddress: 'AQ123',
        authorizationInfo: { withdrawUnfreezePos: 0, claimableVal: 0 },
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'nodeMgmt.noClaimableOnt',
      level: 'warning',
    })

    mocks.governanceService.createWithdrawAuthorizationTransaction.mockResolvedValue('tx')

    await expect(
      createAuthorizationClaimableOntRedeemTransaction({
        currentNode: makeGovernanceNode({ publicKey: 'pk-1' }),
        stakeWalletAddress: 'AQ123',
        authorizationInfo: { withdrawUnfreezePos: 10, claimableVal: 8 },
      })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })
})
