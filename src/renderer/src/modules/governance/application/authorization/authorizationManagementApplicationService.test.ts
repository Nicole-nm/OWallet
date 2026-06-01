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

vi.mock('../../../../domains/governance/governanceDomainService', () => ({
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
import type { GovernanceNode } from '../../../../shared/types'

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

  it('rejects blank or missing input in resolveNewAuthorizationInput', () => {
    expect(resolveNewAuthorizationInput({ units: '' })).toEqual({
      ok: false,
      validInput: false,
      amount: 0,
      errorKey: 'nodeMgmt.invalidInput',
    })

    expect(
      resolveNewAuthorizationInput({
        units: '   ',
        currentNode: { maxAuthorize: 20, totalPos: 5 },
      })
    ).toMatchObject({ ok: false, validInput: false })
  })

  it('accepts input within the remaining capacity for resolveNewAuthorizationInput', () => {
    expect(
      resolveNewAuthorizationInput({
        units: '10',
        currentNode: { maxAuthorize: 20, totalPos: 5 },
      })
    ).toEqual({ ok: true, validInput: true, amount: 10 })
  })

  it('uses 0 capacity when currentNode is missing', () => {
    expect(resolveNewAuthorizationInput({ units: '1' })).toMatchObject({
      ok: false,
      validInput: false,
      amount: 1,
      errorKey: 'nodeMgmt.invalidInput',
    })
  })

  it('canOpenNewAuthorization passes when maxAuthorize > 0 and rejects when undefined', () => {
    expect(canOpenNewAuthorization({ peerAttrs: { maxAuthorize: 5 } })).toEqual({ ok: true })
    expect(canOpenNewAuthorization({})).toMatchObject({ ok: false, level: 'warning' })
  })

  it('createNewAuthorizationTransaction rejects zero amount and invalid pubkey', async () => {
    await expect(
      createNewAuthorizationTransaction({
        currentNode: makeGovernanceNode({ public_key: 'pk-1' }),
        stakeWalletAddress: 'AQ123',
        amount: 0,
      })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeMgmt.invalidInput' })

    await expect(
      createNewAuthorizationTransaction({
        currentNode: makeGovernanceNode({
          public_key: '',
          publickey: '',
          publicKey: '',
          peerPubkey: '',
          pk: '',
          nodePublicKey: '',
        }),
        stakeWalletAddress: 'AQ123',
        amount: 10,
      })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })

  it('validateCancelAuthorizationAmount accepts valid input and rejects blank input', () => {
    expect(
      validateCancelAuthorizationAmount({
        cancelAmount: '20',
        authorizationInfo: { consensusPos: 10, freezePos: 10, newPos: 10 },
      })
    ).toEqual({ ok: true, validCancelAmount: true, amount: 20 })

    expect(validateCancelAuthorizationAmount({ cancelAmount: '' })).toEqual({
      ok: false,
      validCancelAmount: false,
      errorKey: 'nodeMgmt.invalidInput',
    })

    expect(validateCancelAuthorizationAmount({ cancelAmount: '5' })).toMatchObject({
      ok: false,
      validCancelAmount: false,
    })
  })

  it('createCancelAuthorizationTransaction surfaces validation failures and invalid-pubkey errors', async () => {
    await expect(
      createCancelAuthorizationTransaction({
        currentNode: makeGovernanceNode(),
        stakeWalletAddress: 'AQ123',
        cancelAmount: '',
        authorizationInfo: { consensusPos: 5, freezePos: 5, newPos: 5 },
      })
    ).resolves.toMatchObject({ ok: false, validCancelAmount: false })

    await expect(
      createCancelAuthorizationTransaction({
        currentNode: makeGovernanceNode({
          public_key: '',
          publickey: '',
          publicKey: '',
          peerPubkey: '',
          pk: '',
          nodePublicKey: '',
        }),
        stakeWalletAddress: 'AQ123',
        cancelAmount: '5',
        authorizationInfo: { consensusPos: 5, freezePos: 5, newPos: 5 },
      })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })

  it('createAuthorizationRewardsRedeemTransaction succeeds when an amount is provided', async () => {
    mocks.governanceService.createWithdrawFeeTransaction.mockResolvedValue('tx')
    await expect(
      createAuthorizationRewardsRedeemTransaction({ stakeWalletAddress: 'AQ123', amount: 5 })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })

  it('createAuthorizationClaimableOntRedeemTransaction rejects when the node has no usable pubkey', async () => {
    await expect(
      createAuthorizationClaimableOntRedeemTransaction({
        currentNode: makeGovernanceNode({
          public_key: '',
          publickey: '',
          publicKey: '',
          peerPubkey: '',
          pk: '',
          nodePublicKey: '',
        }),
        stakeWalletAddress: 'AQ123',
        authorizationInfo: { withdrawUnfreezePos: 10, claimableVal: 8 },
      })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })

  it('createAuthorizationUnboundOngRedeemTransaction succeeds when an amount is provided', async () => {
    mocks.governanceService.createWithdrawPeerUnboundOngTransaction.mockResolvedValue('tx')
    await expect(
      createAuthorizationUnboundOngRedeemTransaction({ stakeWalletAddress: 'AQ123', amount: 4 })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })
})
