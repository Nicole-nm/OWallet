import { beforeEach, describe, expect, it, vi } from 'vitest'

const domain = vi.hoisted(() => ({
  createAddInitPosTransaction: vi.fn(async () => 'add'),
  createChangeAuthorizationTransaction: vi.fn(async () => 'changeAuth'),
  createQuitNodeTransaction: vi.fn(async () => 'quit'),
  createReduceInitPosTransaction: vi.fn(async () => 'reduce'),
  createSetFeePercentageTransaction: vi.fn(async () => 'fee'),
  createUnregisterCandidateTransaction: vi.fn(async () => 'recall'),
  createWithdrawAuthorizationTransaction: vi.fn(async () => 'withdraw'),
}))
const helper = vi.hoisted(() => ({
  tryCreateTransaction: vi.fn(async ({ action }: { action: () => Promise<unknown> }) => ({
    ok: true,
    transaction: await action(),
  })),
}))
const mapper = vi.hoisted(() => ({ normalizeNodePublicKey: vi.fn(() => 'pk') }))

vi.mock('../../../../domains/governance/governanceDomainService', () => domain)
vi.mock('../../../../domains/transaction/transactionHelper', () => helper)
vi.mock('../../domain/nodeMapper', () => mapper)

import {
  createAddInitPosManagementTransaction,
  createChangeStakeAuthorizationTransaction,
  createChangeStakeCostTransaction,
  createNodeRecallTransaction,
  createNodeRefundTransaction,
  createQuitNodeManagementTransaction,
  createReduceInitPosManagementTransaction,
  createRedeemInitPosManagementTransaction,
} from './nodeStakeTransactionService'

const base = { stakeWalletAddress: 'addr', nodePublicKey: 'pk' }

beforeEach(() => {
  vi.clearAllMocks()
  mapper.normalizeNodePublicKey.mockReturnValue('pk')
})

it('createNodeRecallTransaction builds an unregister transaction', async () => {
  const result = await createNodeRecallTransaction(base)
  expect(domain.createUnregisterCandidateTransaction).toHaveBeenCalledWith(base)
  expect(result).toMatchObject({ ok: true, transaction: 'recall' })
})

describe('createNodeRefundTransaction', () => {
  it('warns when nothing is claimable', async () => {
    const result = await createNodeRefundTransaction({ ...base, claimableAmount: 0 })
    expect(result).toMatchObject({
      ok: false,
      level: 'warning',
      errorKey: 'nodeMgmt.noClaimbleToRefund',
    })
  })
  it('withdraws the claimable amount', async () => {
    const result = await createNodeRefundTransaction({ ...base, claimableAmount: 5 })
    expect(domain.createWithdrawAuthorizationTransaction).toHaveBeenCalledWith({
      ...base,
      amount: 5,
    })
    expect(result).toMatchObject({ ok: true })
  })
})

describe('createQuitNodeManagementTransaction', () => {
  it('warns when there is a claimable init pos', async () => {
    const result = await createQuitNodeManagementTransaction({ ...base, claimableAmount: 5 })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.hasClaimableInitPos' })
  })
  it('quits when nothing claimable', async () => {
    const result = await createQuitNodeManagementTransaction({ ...base, claimableAmount: 0 })
    expect(result).toMatchObject({ ok: true, transaction: 'quit' })
  })
})

it('createAddInitPosManagementTransaction parses the amount', async () => {
  await createAddInitPosManagementTransaction({ ...base, amount: '12' })
  expect(domain.createAddInitPosTransaction).toHaveBeenCalledWith({ ...base, amount: 12 })
})

it('createReduceInitPosManagementTransaction parses the amount', async () => {
  await createReduceInitPosManagementTransaction({ ...base, amount: '7' })
  expect(domain.createReduceInitPosTransaction).toHaveBeenCalledWith({ ...base, amount: 7 })
})

describe('createRedeemInitPosManagementTransaction', () => {
  it('warns when nothing is claimable', async () => {
    const result = await createRedeemInitPosManagementTransaction({ ...base, claimableAmount: 0 })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.noClaimbleInitPos' })
  })
  it('withdraws when claimable', async () => {
    const result = await createRedeemInitPosManagementTransaction({ ...base, claimableAmount: 3 })
    expect(result).toMatchObject({ ok: true })
  })
})

describe('createChangeStakeAuthorizationTransaction', () => {
  it('rejects an invalid public key', async () => {
    mapper.normalizeNodePublicKey.mockReturnValue('')
    const result = await createChangeStakeAuthorizationTransaction({
      stakeWalletAddress: 'addr',
      unit: '1',
      unitVal: 1,
      currentMaxAuthorize: 0,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })
  it('warns when the authorization is unchanged', async () => {
    const result = await createChangeStakeAuthorizationTransaction({
      stakeWalletAddress: 'addr',
      unit: '5',
      unitVal: 2,
      currentMaxAuthorize: 10,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.noChange' })
  })
  it('changes the authorization', async () => {
    const result = await createChangeStakeAuthorizationTransaction({
      stakeWalletAddress: 'addr',
      unit: '5',
      unitVal: 2,
      currentMaxAuthorize: 4,
    })
    expect(domain.createChangeAuthorizationTransaction).toHaveBeenCalledWith({
      nodePublicKey: 'pk',
      stakeWalletAddress: 'addr',
      maxAuthorize: 10,
    })
    expect(result).toMatchObject({ ok: true })
  })
})

describe('createChangeStakeCostTransaction', () => {
  it('rejects an invalid public key', async () => {
    mapper.normalizeNodePublicKey.mockReturnValue('')
    const result = await createChangeStakeCostTransaction({
      stakeWalletAddress: 'addr',
      peerCost: '1',
      stakeCost: '2',
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })
  it('sets the fee percentage', async () => {
    await createChangeStakeCostTransaction({
      stakeWalletAddress: 'addr',
      peerCost: '10',
      stakeCost: '20',
    })
    expect(domain.createSetFeePercentageTransaction).toHaveBeenCalledWith({
      nodePublicKey: 'pk',
      stakeWalletAddress: 'addr',
      peerCost: 10,
      stakeCost: 20,
    })
  })
})
