import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  createAuthorizationRewardsRedeemTransaction: vi.fn(),
  createAuthorizationClaimableOntRedeemTransaction: vi.fn(),
  createAuthorizationUnboundOngRedeemTransaction: vi.fn(),
}))

vi.mock(
  '../../modules/governance/application/authorization/authorizationManagementApplicationService',
  () => ({
    createAuthorizationRewardsRedeemTransaction: (...args: unknown[]) =>
      mocks.createAuthorizationRewardsRedeemTransaction(...args),
    createAuthorizationClaimableOntRedeemTransaction: (...args: unknown[]) =>
      mocks.createAuthorizationClaimableOntRedeemTransaction(...args),
    createAuthorizationUnboundOngRedeemTransaction: (...args: unknown[]) =>
      mocks.createAuthorizationUnboundOngRedeemTransaction(...args),
  })
)

import { useAuthorizationTransactions } from './useAuthorizationTransactions'

function createDeps() {
  return {
    signVisible: ref(false),
    tx: ref(''),
    currentNode: ref({ publicKey: 'node-public-key' }),
    authorizationInfo: ref({ consensusPos: 5 }),
    splitFee: ref({ address: 'AQ123', amount: '7' }),
    unboundOng: ref(3),
    resolveStakeWallet: vi.fn(() => ({ address: 'AQ123' })),
  }
}

describe('useAuthorizationTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAuthorizationRewardsRedeemTransaction.mockResolvedValue({
      ok: true,
      tx: 'reward-tx',
    })
    mocks.createAuthorizationClaimableOntRedeemTransaction.mockResolvedValue({
      ok: true,
      tx: 'claim-tx',
    })
    mocks.createAuthorizationUnboundOngRedeemTransaction.mockResolvedValue({
      ok: true,
      tx: 'unbound-tx',
    })
  })

  it('rejects each redemption action when no wallet is selected', async () => {
    const deps = createDeps()
    deps.resolveStakeWallet.mockReturnValue(null as never)
    const transactions = useAuthorizationTransactions(deps as never)

    await expect(transactions.redeemSplitFeeRewards()).resolves.toMatchObject({ ok: false })
    await expect(transactions.redeemClaimableOnt()).resolves.toMatchObject({ ok: false })
    await expect(transactions.redeemPeerUnboundOng()).resolves.toMatchObject({ ok: false })
  })

  it('propagates redemption failures and opens signing after successful redemptions', async () => {
    const deps = createDeps()
    const transactions = useAuthorizationTransactions(deps as never)
    mocks.createAuthorizationRewardsRedeemTransaction.mockResolvedValueOnce({
      ok: false,
      errorKey: 'nodeMgmt.noRewards',
    })
    mocks.createAuthorizationClaimableOntRedeemTransaction.mockResolvedValueOnce({
      ok: false,
      errorKey: 'nodeMgmt.noClaimableOnt',
    })
    mocks.createAuthorizationUnboundOngRedeemTransaction.mockResolvedValueOnce({
      ok: false,
      errorKey: 'nodeMgmt.noUnboundOng',
    })

    await expect(transactions.redeemSplitFeeRewards()).resolves.toMatchObject({ ok: false })
    await expect(transactions.redeemClaimableOnt()).resolves.toMatchObject({ ok: false })
    await expect(transactions.redeemPeerUnboundOng()).resolves.toMatchObject({ ok: false })

    deps.splitFee.value.amount = 'not-a-number'
    await expect(transactions.redeemSplitFeeRewards()).resolves.toEqual({ ok: true })
    expect(mocks.createAuthorizationRewardsRedeemTransaction).toHaveBeenLastCalledWith({
      stakeWalletAddress: 'AQ123',
      amount: 0,
    })
    expect(deps.tx.value).toBe('reward-tx')

    await expect(transactions.redeemClaimableOnt()).resolves.toEqual({ ok: true })
    expect(deps.tx.value).toBe('claim-tx')

    await expect(transactions.redeemPeerUnboundOng()).resolves.toEqual({ ok: true })
    expect(deps.tx.value).toBe('unbound-tx')
    expect(deps.signVisible.value).toBe(true)
  })
})
