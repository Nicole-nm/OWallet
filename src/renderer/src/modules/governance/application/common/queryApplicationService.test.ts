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
  mapper.mapOffChainNodeRecord.mockImplementation((record: { addr?: string; pk?: string }) => ({
    nodeAddress: record.addr,
    publicKey: record.pk || 'pk-' + record.addr,
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

  it('emits one card per node when a stake wallet owns multiple nodes', async () => {
    domain.fetchPeerPoolMap.mockResolvedValue({})
    domain.fetchOffChainNodes.mockResolvedValue([
      { addr: 'A', pk: 'op1' },
      { addr: 'A', pk: 'op2' },
      { addr: 'B', pk: 'op3' },
    ])

    const result = await loadMyNodeCards({
      network: 'MAIN_NET',
      wallets: [{ address: 'A' }, { address: 'B' }, { address: 'Z' }],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.nodes).toHaveLength(3)
    expect(mapper.mapMyNodeCard).toHaveBeenCalledTimes(3)

    type MapCardArgs = {
      wallet: { address: string }
      offChainNode: { publicKey: string }
      peer: unknown
    }
    const calls = mapper.mapMyNodeCard.mock.calls as Array<[MapCardArgs]>
    const callsForWalletA = calls.filter(([args]) => args.wallet.address === 'A')
    expect(callsForWalletA).toHaveLength(2)
    const pubkeysForWalletA = callsForWalletA.map(([args]) => args.offChainNode.publicKey)
    expect(new Set(pubkeysForWalletA)).toEqual(new Set(['op1', 'op2']))
  })

  it('looks up the peer pool entry per node, not per wallet', async () => {
    domain.fetchPeerPoolMap.mockResolvedValue({
      op1: { peer: 'one' },
      op2: { peer: 'two' },
    })
    domain.fetchOffChainNodes.mockResolvedValue([
      { addr: 'A', pk: 'op1' },
      { addr: 'A', pk: 'op2' },
    ])

    const result = await loadMyNodeCards({
      network: 'MAIN_NET',
      wallets: [{ address: 'A' }],
    })

    expect(result.ok).toBe(true)
    type MapCardArgs = {
      wallet: { address: string }
      offChainNode: { publicKey: string }
      peer: unknown
    }
    const calls = mapper.mapMyNodeCard.mock.calls as Array<[MapCardArgs]>
    const peersByPubkey: Record<string, unknown> = {}
    for (const [args] of calls) {
      peersByPubkey[args.offChainNode.publicKey] = args.peer
    }
    expect(peersByPubkey).toEqual({
      op1: { peer: 'one' },
      op2: { peer: 'two' },
    })
  })

  it('returns an empty list when a query throws', async () => {
    domain.fetchPeerPoolMap.mockRejectedValue(new Error('boom'))
    domain.fetchOffChainNodes.mockResolvedValue([])
    const result = await loadMyNodeCards({ network: 'MAIN_NET', wallets: [{ address: 'A' }] })
    expect(result).toMatchObject({ ok: false, nodes: [] })
  })
})
