import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
  builder: {
    getPeerPoolMap: vi.fn(),
    getAttributes: vi.fn(),
    getAuthorizeInfo: vi.fn(),
    getSplitFeeAddress: vi.fn(),
    getGlobalParam: vi.fn(),
    getPeerUnboundOng: vi.fn(),
  },
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: { get: mocks.httpGet },
}))

vi.mock('../../shared/lib/constants', () => ({
  getExplorerApiBaseUrl: vi.fn(() => 'https://explorer.example'),
  getExplorerApiUrl: vi.fn((path: string) => `https://explorer.example${path}`),
}))

vi.mock('../../shared/chain/loadOntologySdk', () => {
  class FakeAddress {
    constructor(public value: string) {}
  }
  return { loadOntologySdk: vi.fn(async () => ({ Crypto: { Address: FakeAddress } })) }
})

vi.mock('./governanceStorageReader', () => mocks.builder)

import {
  fetchAuthorizationInfo,
  fetchNodeStakeList,
  fetchOffChainNodes,
  fetchPeerAttributes,
  fetchPeerFromPool,
  fetchPeerPoolMap,
  fetchPeerUnboundOng,
  fetchPosLimit,
  fetchRoundBlockCount,
  fetchSplitFee,
  formatAuthorizationInfo,
  searchUserStakeHistory,
} from './queryService'

beforeEach(() => {
  vi.clearAllMocks()
})

const baseAuthInfo = {
  consensusPos: 10,
  freezePos: 5,
  newPos: 3,
  withdrawPos: 2,
  withdrawFreezePos: 1,
  withdrawUnfreezePos: 4,
}

describe('formatAuthorizationInfo', () => {
  it('aggregates authorization positions into display fields', () => {
    const result = formatAuthorizationInfo(baseAuthInfo as never)
    expect(result.claimableVal).toBe(4)
    expect(result).toHaveProperty('inAuthorization')
    expect(result).toHaveProperty('locked')
    expect(result).toHaveProperty('newStakePortion')
    expect(result).toHaveProperty('receiveProfitPortion')
  })
})

describe('peer pool queries', () => {
  it('fetchPeerFromPool returns the full map when no public key is given', async () => {
    mocks.builder.getPeerPoolMap.mockResolvedValue({ pk1: { x: 1 } })
    expect(await fetchPeerFromPool(undefined)).toEqual({ pk1: { x: 1 } })
  })

  it('fetchPeerFromPool returns a single peer or null', async () => {
    mocks.builder.getPeerPoolMap.mockResolvedValue({ pk1: { x: 1 } })
    expect(await fetchPeerFromPool('pk1')).toEqual({ x: 1 })
    expect(await fetchPeerFromPool('missing')).toBeNull()
  })

  it('fetchPeerPoolMap and fetchPeerAttributes delegate to the builder', async () => {
    mocks.builder.getPeerPoolMap.mockResolvedValue({ a: 1 })
    mocks.builder.getAttributes.mockResolvedValue({ b: 2 })
    expect(await fetchPeerPoolMap()).toEqual({ a: 1 })
    expect(await fetchPeerAttributes('pk')).toEqual({ b: 2 })
  })
})

describe('address-based queries', () => {
  it('fetchAuthorizationInfo passes an SDK address to the builder', async () => {
    mocks.builder.getAuthorizeInfo.mockResolvedValue({ consensusPos: 1 })
    expect(await fetchAuthorizationInfo('pk', 'addr')).toEqual({ consensusPos: 1 })
    expect(mocks.builder.getAuthorizeInfo).toHaveBeenCalled()
  })

  it('fetchSplitFee scales the amount down by 1e9', async () => {
    mocks.builder.getSplitFeeAddress.mockResolvedValue({ amount: '2000000000' })
    const result = (await fetchSplitFee('addr')) as { amount: string }
    expect(result.amount).toBe('2.000000000')
  })

  it('fetchSplitFee returns the raw value when there is no amount', async () => {
    mocks.builder.getSplitFeeAddress.mockResolvedValue(null)
    expect(await fetchSplitFee('addr')).toBeNull()
  })

  it('fetchPeerUnboundOng converts raw ong to a number', async () => {
    mocks.builder.getPeerUnboundOng.mockResolvedValue('3000000000')
    expect(await fetchPeerUnboundOng('addr')).toBe(3)
  })
})

describe('fetchPosLimit', () => {
  it('returns the configured pos limit', async () => {
    mocks.builder.getGlobalParam.mockResolvedValue({ posLimit: 25 })
    expect(await fetchPosLimit()).toBe(25)
  })

  it('defaults to 10 when no global param is available', async () => {
    mocks.builder.getGlobalParam.mockResolvedValue(undefined)
    expect(await fetchPosLimit()).toBe(10)
  })
})

describe('searchUserStakeHistory', () => {
  it('includes nodes with positive stake and excludes the user own node and empty stakes', async () => {
    mocks.builder.getAuthorizeInfo.mockImplementation(async (pk: string) => {
      if (pk === 'pkActive') return { ...baseAuthInfo }
      return {
        consensusPos: 0,
        freezePos: 0,
        newPos: 0,
        withdrawPos: 0,
        withdrawFreezePos: 0,
        withdrawUnfreezePos: 0,
      }
    })

    const result = await searchUserStakeHistory('userAddr', [
      { public_key: 'pkActive', address: 'nodeA', name: 'Alpha' } as never,
      { public_key: 'pkEmpty', address: 'nodeB', name: 'Beta' } as never,
      { public_key: 'pkSelf', address: 'userAddr', name: 'Self' } as never,
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.nodePublicKey).toBe('pkActive')
  })
})

describe('explorer endpoints', () => {
  it('fetchNodeStakeList returns the result on success and throws otherwise', async () => {
    mocks.httpGet.mockResolvedValueOnce({ code: 0, result: ['n'] })
    expect(await fetchNodeStakeList('MAIN_NET')).toEqual(['n'])
    mocks.httpGet.mockResolvedValueOnce({ code: 1 })
    await expect(fetchNodeStakeList('MAIN_NET')).rejects.toThrow()
  })

  it('fetchRoundBlockCount returns a number on success and throws otherwise', async () => {
    mocks.httpGet.mockResolvedValueOnce({ result: { count_to_next_round: '42' } })
    expect(await fetchRoundBlockCount('MAIN_NET')).toBe(42)
    mocks.httpGet.mockResolvedValueOnce({})
    await expect(fetchRoundBlockCount('MAIN_NET')).rejects.toThrow()
  })

  it('fetchOffChainNodes returns the result on success and throws otherwise', async () => {
    mocks.httpGet.mockResolvedValueOnce({ result: { nodes: [] } })
    expect(await fetchOffChainNodes('MAIN_NET')).toEqual({ nodes: [] })
    mocks.httpGet.mockResolvedValueOnce({})
    await expect(fetchOffChainNodes('MAIN_NET')).rejects.toThrow()
  })
})
