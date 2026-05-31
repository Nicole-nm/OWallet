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

vi.mock('../../../../domains/governance/queryService', () => ({
  formatAuthorizationInfo: vi.fn(() => ({ inAuthorization: '0' })),
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
  createEmptyAuthorizationInfo,
  createEmptyAuthorizationPeer,
  createEmptyAuthorizationPeerAttributes,
  loadAuthorizationBlockCountdown,
  loadAuthorizationNodeListPage,
  loadAuthorizationStakeHistory,
  mapAuthorizationInfoRecord,
  mapAuthorizationNodeListPage,
  mapAuthorizationPeer,
  mapAuthorizationPeerAttributes,
  refreshAuthorizationNodeSettings,
  refreshAuthorizationOverview,
  refreshAuthorizationStakeInfo,
} from './authorizationQueryApplicationService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mapAuthorizationPeer address resolution', () => {
  it('keeps a string address verbatim', () => {
    expect(mapAuthorizationPeer({ peerPubkey: 'pk', address: 'AQstring' }).address).toBe('AQstring')
  })

  it('resolves a base58 address object', () => {
    expect(mapAuthorizationPeer({ address: { toBase58: () => 'AQbase58' } }).address).toBe(
      'AQbase58'
    )
  })

  it('returns an empty string when no address is present', () => {
    expect(mapAuthorizationPeer({ totalPos: 5 }).address).toBe('')
  })
})

describe('mapAuthorizationPeerAttributes', () => {
  it('returns the empty attributes for nullish input', () => {
    expect(mapAuthorizationPeerAttributes(null)).toEqual(createEmptyAuthorizationPeerAttributes())
  })

  it('maps populated attributes with display strings', () => {
    const attrs = mapAuthorizationPeerAttributes({ peerPubkey: 'pk', maxAuthorize: 100 })
    expect(attrs).toMatchObject({ peerPubkey: 'pk', maxAuthorizeStr: expect.any(String) })
  })
})

describe('mapAuthorizationInfoRecord', () => {
  it('returns the empty info for nullish input', () => {
    expect(mapAuthorizationInfoRecord(null)).toEqual(createEmptyAuthorizationInfo())
  })

  it('merges the formatted fields into the record', () => {
    expect(mapAuthorizationInfoRecord({ peerPubkey: 'pk' } as never)).toMatchObject({
      peerPubkey: 'pk',
      inAuthorization: '0',
    })
  })
})

describe('mapAuthorizationNodeListPage pagination', () => {
  it('slices by page and prefers camelCase values', () => {
    const items = [
      { node_rank: 1, init_pos: 5, current_stake: 50 },
      { rank: 2, initPos: 7, currentStakeValue: 70, address: 'AQ2' },
    ]
    const page = mapAuthorizationNodeListPage(items, 1, 1)
    expect(page.total).toBe(2)
    expect(page.list).toHaveLength(1)
    expect(page.list[0]).toMatchObject({ rank: 2, initPos: 7, address: 'AQ2' })
  })

  it('defaults to an empty list when no items are provided', () => {
    expect(mapAuthorizationNodeListPage()).toEqual({ total: 0, list: [] })
  })
})

describe('refreshAuthorizationOverview fallbacks', () => {
  it('returns fallbacks when a query throws', async () => {
    queryServiceMocks.fetchAuthorizationInfo.mockRejectedValue(new Error('boom'))
    const result = await refreshAuthorizationOverview({ address: 'AQ', pk: 'pk' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.peerUnboundOng).toBe(0)
      expect(result.splitFee).toEqual(expect.objectContaining({ amount: 0 }))
      expect(result.currentPeer).toEqual(createEmptyAuthorizationPeer())
    }
  })

  it('substitutes empty split fee and zero unbound ong', async () => {
    queryServiceMocks.fetchAuthorizationInfo.mockResolvedValue(null)
    queryServiceMocks.fetchSplitFee.mockResolvedValue(undefined)
    queryServiceMocks.fetchPeerAttributes.mockResolvedValue(null)
    queryServiceMocks.fetchPeerUnboundOng.mockResolvedValue(undefined)
    queryServiceMocks.fetchPeerFromPool.mockResolvedValue(null)

    const result = await refreshAuthorizationOverview({ address: 'AQ', pk: 'pk' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.peerUnboundOng).toBe(0)
      expect(result.authorizationInfo).toEqual(createEmptyAuthorizationInfo())
      expect(result.currentPeer).toEqual(createEmptyAuthorizationPeer())
    }
  })
})

describe('refreshAuthorizationStakeInfo', () => {
  it('returns mapped stake info with the default pos limit', async () => {
    queryServiceMocks.fetchPeerFromPool.mockResolvedValue({ peerPubkey: 'pk' })
    queryServiceMocks.fetchPosLimit.mockResolvedValue(undefined)
    queryServiceMocks.fetchAuthorizationInfo.mockResolvedValue({ peerPubkey: 'pk' })

    const result = await refreshAuthorizationStakeInfo({ address: 'AQ', pk: 'pk' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.posLimit).toBe(10)
  })

  it('returns fallbacks on error', async () => {
    queryServiceMocks.fetchPeerFromPool.mockRejectedValue(new Error('x'))
    const result = await refreshAuthorizationStakeInfo({ address: 'AQ', pk: 'pk' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.posLimit).toBe(10)
      expect(result.currentPeer).toEqual(createEmptyAuthorizationPeer())
    }
  })
})

describe('refreshAuthorizationNodeSettings', () => {
  it('aggregates node settings on success', async () => {
    queryServiceMocks.fetchPeerFromPool.mockResolvedValue({ peerPubkey: 'pk' })
    queryServiceMocks.fetchPeerAttributes.mockResolvedValue({ peerPubkey: 'pk' })
    queryServiceMocks.fetchSplitFee.mockResolvedValue(undefined)
    queryServiceMocks.fetchPosLimit.mockResolvedValue(25)
    queryServiceMocks.fetchPeerUnboundOng.mockResolvedValue(7)

    const result = await refreshAuthorizationNodeSettings({ address: 'AQ', pk: 'pk' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.posLimit).toBe(25)
      expect(result.peerUnboundOng).toBe(7)
    }
  })

  it('returns fallbacks on error', async () => {
    queryServiceMocks.fetchPeerFromPool.mockRejectedValue(new Error('x'))
    const result = await refreshAuthorizationNodeSettings({ address: 'AQ', pk: 'pk' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.peerUnboundOng).toBe(0)
  })
})

describe('loadAuthorizationNodeListPage success paths', () => {
  it('returns a normalized page on success', async () => {
    queryServiceMocks.fetchNodeStakeList.mockResolvedValue([{ rank: 1 }])
    const result = await loadAuthorizationNodeListPage({ network: 'net', pageSize: 10, pageNum: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.total).toBe(1)
  })

  it('treats non-array responses as empty', async () => {
    queryServiceMocks.fetchNodeStakeList.mockResolvedValue(null)
    const result = await loadAuthorizationNodeListPage({ network: 'net' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.nodes).toEqual([])
  })
})

describe('loadAuthorizationBlockCountdown', () => {
  it('returns the round block countdown', async () => {
    queryServiceMocks.fetchRoundBlockCount.mockResolvedValue(123)
    const result = await loadAuthorizationBlockCountdown({ network: 'net' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.countdown).toBe(123)
  })
})

describe('loadAuthorizationStakeHistory edge cases', () => {
  it('filters placeholder nodes before searching', async () => {
    queryServiceMocks.fetchOffChainNodes.mockResolvedValue([
      { publicKey: '00aaaaaaaaaPLACEHOLDER' },
      { publicKey: 'real-node' },
    ])
    queryServiceMocks.searchUserStakeHistory.mockResolvedValue([{ id: 1 }])

    const result = await loadAuthorizationStakeHistory({ network: 'net', address: 'AQ' })
    expect(result.ok).toBe(true)
    expect(queryServiceMocks.searchUserStakeHistory).toHaveBeenCalledWith('AQ', [
      { publicKey: 'real-node' },
    ])
  })

  it('returns empty history on error', async () => {
    queryServiceMocks.fetchOffChainNodes.mockRejectedValue(new Error('x'))
    const result = await loadAuthorizationStakeHistory({ network: 'net', address: 'AQ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.stakeHistory).toEqual([])
  })
})
