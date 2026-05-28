import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryServiceMocks = vi.hoisted(() => ({
  fetchNodeStakeList: vi.fn(),
  fetchAuthorizationInfo: vi.fn(),
  fetchSplitFee: vi.fn(),
  fetchPeerAttributes: vi.fn(),
  fetchPeerUnboundOng: vi.fn(),
  fetchPeerFromPool: vi.fn(),
  fetchPosLimit: vi.fn(),
  fetchRoundBlockCount: vi.fn(),
  fetchOffChainNodes: vi.fn(),
  searchUserStakeHistory: vi.fn(),
}))

vi.mock('../../../domains/governance/queryService', () => ({
  formatAuthorizationInfo: vi.fn((info) => ({
    inAuthorization: String(info.consensusPos + info.freezePos + info.newPos),
    locked: String(info.withdrawPos + info.withdrawFreezePos),
    claimable: String(info.withdrawUnfreezePos),
    claimableVal: info.withdrawUnfreezePos,
    newStakePortion: String(info.newPos),
    receiveProfitPortion: String(info.consensusPos + info.freezePos),
  })),
  fetchNodeStakeList: queryServiceMocks.fetchNodeStakeList,
  fetchAuthorizationInfo: queryServiceMocks.fetchAuthorizationInfo,
  fetchSplitFee: queryServiceMocks.fetchSplitFee,
  fetchPeerAttributes: queryServiceMocks.fetchPeerAttributes,
  fetchPeerUnboundOng: queryServiceMocks.fetchPeerUnboundOng,
  fetchPeerFromPool: queryServiceMocks.fetchPeerFromPool,
  fetchPosLimit: queryServiceMocks.fetchPosLimit,
  fetchRoundBlockCount: queryServiceMocks.fetchRoundBlockCount,
  fetchOffChainNodes: queryServiceMocks.fetchOffChainNodes,
  searchUserStakeHistory: queryServiceMocks.searchUserStakeHistory,
}))

import {
  createEmptyAuthorizationPeer,
  loadAuthorizationNodeListPage,
  loadAuthorizationStakeHistory,
  mapAuthorizationNodeListPage,
  mapAuthorizationPeer,
  refreshAuthorizationOverview,
} from './authorizationQueryApplicationService'

describe('authorizationQueryApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps missing peer records to an empty peer state', () => {
    expect(mapAuthorizationPeer(null)).toEqual(createEmptyAuthorizationPeer())
  })

  it('maps paged authorization node records with display fields', () => {
    const page = mapAuthorizationNodeListPage(
      [
        {
          peerPubkey: 'peer-1',
          name: 'Node A',
          address: 'address-1',
          status: 2,
          node_rank: 1,
          node_proportion: '20%',
          user_proportion: '80%',
          current_stake: 1200,
          progress: '88%',
          init_pos: 500,
          detail_url: 'https://example.com/node-a',
          total_pos: 1700,
          max_authorize: 10,
        },
      ],
      10,
      0
    )

    expect(page.total).toBe(1)
    expect(page.list).toEqual([
      expect.objectContaining({
        rank: 1,
        nodeProportion: '20%',
        userProportion: '80%',
        currentStakeValue: 1200,
        currentStake: '1,200',
        detailUrl: 'https://example.com/node-a',
      }),
    ])
    expect(page.list[0]).not.toHaveProperty('node_rank')
  })

  it('loads authorization overview data and returns normalized state', async () => {
    queryServiceMocks.fetchAuthorizationInfo.mockResolvedValue({
      consensusPos: 2,
      freezePos: 3,
      newPos: 4,
      withdrawPos: 5,
      withdrawFreezePos: 6,
      withdrawUnfreezePos: 7,
    })
    queryServiceMocks.fetchSplitFee.mockResolvedValue({ address: 'A', amount: '1.0' })
    queryServiceMocks.fetchPeerAttributes.mockResolvedValue({
      peerPubkey: 'peer-1',
      maxAuthorize: 10,
      t2PeerCost: 1,
      t1PeerCost: 2,
      tPeerCost: 3,
      t2StakeCost: 4,
      t1StakeCost: 5,
      tStakeCost: 6,
    })
    queryServiceMocks.fetchPeerUnboundOng.mockResolvedValue(9)

    const result = await refreshAuthorizationOverview({
      address: 'wallet-address',
      pk: 'peer-1',
    })

    expect(result).toEqual({
      ok: true,
      authorizationInfo: expect.objectContaining({
        inAuthorization: '9',
        locked: '11',
        claimable: '7',
      }),
      splitFee: { address: 'A', amount: '1.0' },
      peerAttributes: expect.objectContaining({
        peerPubkey: 'peer-1',
        maxAuthorize: 10,
        maxAuthorizeStr: '10',
      }),
      peerUnboundOng: 9,
    })
  })

  it('loads a node list page and returns an empty list when the query fails', async () => {
    queryServiceMocks.fetchNodeStakeList.mockRejectedValue(new Error('network down'))

    const result = await loadAuthorizationNodeListPage({
      network: 'MAIN_NET',
      pageSize: 10,
      pageNum: 0,
    })

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        errorKey: 'commonWalletHome.networkError',
        total: 0,
        nodes: [] as unknown[],
      })
    )
  })

  it('loads stake history records without mutating a store', async () => {
    queryServiceMocks.fetchOffChainNodes.mockResolvedValue([{ publicKey: 'peer-1' }])
    queryServiceMocks.searchUserStakeHistory.mockResolvedValue([{ txHash: 'tx-1' }])

    await expect(
      loadAuthorizationStakeHistory({
        network: 'MAIN_NET',
        address: 'AQ123',
      })
    ).resolves.toEqual({
      ok: true,
      stakeHistory: [{ txHash: 'tx-1' }],
    })
  })
})
