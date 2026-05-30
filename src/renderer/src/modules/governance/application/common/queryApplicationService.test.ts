import { beforeEach, describe, expect, it, vi } from 'vitest'

const domain = vi.hoisted(() => ({
  fetchOffChainNodes: vi.fn(),
  fetchPeerPoolMap: vi.fn(),
}))
const mapper = vi.hoisted(() => ({
  mapMyNodeCard: vi.fn(),
  mapOffChainNodeRecord: vi.fn(),
}))

vi.mock('../../../../domains/governance/queryService', () => domain)
vi.mock('../../domain/nodeMapper', () => mapper)

import { loadMyNodeCards } from './queryApplicationService'

beforeEach(() => {
  vi.clearAllMocks()
  mapper.mapOffChainNodeRecord.mockImplementation((record: { addr?: string }) => ({
    nodeAddress: record.addr,
    publicKey: 'pk-' + record.addr,
  }))
  mapper.mapMyNodeCard.mockImplementation((args: unknown) => ({ card: args }))
})

describe('loadMyNodeCards', () => {
  it('builds cards for wallets that match an off-chain node', async () => {
    domain.fetchPeerPoolMap.mockResolvedValue({ 'pk-A': { peer: true } })
    domain.fetchOffChainNodes.mockResolvedValue([{ addr: 'A' }, { addr: 'B' }])

    const result = await loadMyNodeCards({
      network: 'MAIN_NET',
      wallets: [{ address: 'A' }, { address: 'Z' }],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.nodes).toHaveLength(1)
    expect(mapper.mapMyNodeCard).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list when a query throws', async () => {
    domain.fetchPeerPoolMap.mockRejectedValue(new Error('boom'))
    domain.fetchOffChainNodes.mockResolvedValue([])
    const result = await loadMyNodeCards({ network: 'MAIN_NET', wallets: [{ address: 'A' }] })
    expect(result).toMatchObject({ ok: false, nodes: [] })
  })
})
