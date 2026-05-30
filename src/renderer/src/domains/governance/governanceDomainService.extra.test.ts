import { beforeEach, expect, it, vi } from 'vitest'

const builder = vi.hoisted(() => ({
  buildAddInitPos: vi.fn(() => 'addInitPos'),
  buildAuthorizeForPeer: vi.fn(() => 'authorize'),
  buildChangeAuthorization: vi.fn(() => 'changeAuth'),
  buildQuitNode: vi.fn(() => 'quitNode'),
  buildReduceInitPos: vi.fn(() => 'reduceInitPos'),
  buildRegisterCandidate: vi.fn(() => 'registerCandidate'),
  buildSetFeePercentage: vi.fn(() => 'setFee'),
  buildUnauthorizeForPeer: vi.fn(() => 'unauthorize'),
  buildUnregisterCandidate: vi.fn(() => 'unregister'),
  buildWithdraw: vi.fn(() => 'withdraw'),
  buildWithdrawFee: vi.fn(() => 'withdrawFee'),
  buildWithdrawPeerUnboundOng: vi.fn(() => 'withdrawUnbound'),
}))

vi.mock('./transactionBuilder', () => builder)

import {
  createAddInitPosTransaction,
  createAuthorizationTransaction,
  createChangeAuthorizationTransaction,
  createQuitNodeTransaction,
  createReduceInitPosTransaction,
  createRegisterCandidateTransaction,
  createSetFeePercentageTransaction,
  createUnauthorizationTransaction,
  createUnregisterCandidateTransaction,
  createWithdrawAuthorizationTransaction,
  createWithdrawFeeTransaction,
  createWithdrawPeerUnboundOngTransaction,
} from './governanceDomainService'

beforeEach(() => {
  vi.clearAllMocks()
})

const node = { stakeWalletAddress: 'addr', nodePublicKey: 'pk' }

it('createAuthorizationTransaction wraps the peer authorize builder', async () => {
  expect(await createAuthorizationTransaction({ ...node, amount: 5 })).toBe('authorize')
  expect(builder.buildAuthorizeForPeer).toHaveBeenCalledWith('addr', ['pk'], [5])
})

it('createUnauthorizationTransaction wraps the unauthorize builder', async () => {
  expect(await createUnauthorizationTransaction({ ...node, amount: 5 })).toBe('unauthorize')
  expect(builder.buildUnauthorizeForPeer).toHaveBeenCalledWith('addr', ['pk'], [5])
})

it('createWithdrawAuthorizationTransaction wraps the withdraw builder', async () => {
  expect(await createWithdrawAuthorizationTransaction({ ...node, amount: 5 })).toBe('withdraw')
  expect(builder.buildWithdraw).toHaveBeenCalledWith('addr', ['pk'], [5])
})

it('createRegisterCandidateTransaction wraps the register builder', async () => {
  expect(
    await createRegisterCandidateTransaction({
      ontid: 'did',
      publicKey: 'pk',
      initPos: 100,
      stakeWalletAddress: 'addr',
    })
  ).toBe('registerCandidate')
  expect(builder.buildRegisterCandidate).toHaveBeenCalledWith('did', 'pk', 1, 'addr', 100, 'addr')
})

it('createUnregisterCandidateTransaction wraps the unregister builder', async () => {
  expect(await createUnregisterCandidateTransaction(node)).toBe('unregister')
  expect(builder.buildUnregisterCandidate).toHaveBeenCalledWith('addr', 'pk')
})

it('createQuitNodeTransaction wraps the quit builder', async () => {
  expect(await createQuitNodeTransaction(node)).toBe('quitNode')
  expect(builder.buildQuitNode).toHaveBeenCalledWith('addr', 'pk')
})

it('createAddInitPosTransaction wraps the add-init-pos builder', async () => {
  expect(await createAddInitPosTransaction({ ...node, amount: 5 })).toBe('addInitPos')
  expect(builder.buildAddInitPos).toHaveBeenCalledWith('pk', 'addr', 5)
})

it('createReduceInitPosTransaction wraps the reduce-init-pos builder', async () => {
  expect(await createReduceInitPosTransaction({ ...node, amount: 5 })).toBe('reduceInitPos')
  expect(builder.buildReduceInitPos).toHaveBeenCalledWith('pk', 'addr', 5)
})

it('createChangeAuthorizationTransaction wraps the change-authorization builder', async () => {
  expect(await createChangeAuthorizationTransaction({ ...node, maxAuthorize: 9 })).toBe(
    'changeAuth'
  )
  expect(builder.buildChangeAuthorization).toHaveBeenCalledWith('pk', 'addr', 9)
})

it('createSetFeePercentageTransaction wraps the set-fee builder', async () => {
  expect(await createSetFeePercentageTransaction({ ...node, peerCost: 10, stakeCost: 20 })).toBe(
    'setFee'
  )
  expect(builder.buildSetFeePercentage).toHaveBeenCalledWith('pk', 'addr', 10, 20, 'addr')
})

it('createWithdrawFeeTransaction wraps the withdraw-fee builder', async () => {
  expect(await createWithdrawFeeTransaction({ stakeWalletAddress: 'addr' })).toBe('withdrawFee')
  expect(builder.buildWithdrawFee).toHaveBeenCalledWith('addr')
})

it('createWithdrawPeerUnboundOngTransaction wraps the unbound-ong builder', async () => {
  expect(await createWithdrawPeerUnboundOngTransaction({ stakeWalletAddress: 'addr' })).toBe(
    'withdrawUnbound'
  )
  expect(builder.buildWithdrawPeerUnboundOng).toHaveBeenCalledWith('addr')
})
