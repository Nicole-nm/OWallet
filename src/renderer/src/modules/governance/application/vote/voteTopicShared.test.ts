import { beforeEach, describe, expect, it, vi } from 'vitest'

const deps = vi.hoisted(() => ({
  deriveAddressFromPublicKey: vi.fn(async (pk: string) => 'addr-' + pk),
  fetchVoteContractAddress: vi.fn(),
  getContractHashFallback: vi.fn(),
  normalizeNodePublicKey: vi.fn((s: { pk?: string }) => s?.pk || 'pk'),
}))

vi.mock('../../../../shared/lib/constants', () => ({
  VOTE_ROLE: { VOTER: 'voter', ADMIN: 'admin' },
}))
vi.mock('../../../../shared/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}))
vi.mock('../../../../shared/chain/walletSdk', () => ({
  deriveAddressFromPublicKey: deps.deriveAddressFromPublicKey,
}))
vi.mock('../../../../domains/governance/nodeStakeDomainService', () => ({
  fetchVoteContractAddress: deps.fetchVoteContractAddress,
}))
vi.mock('../../../../domains/governance/voteService', () => ({
  getContractHashFallback: deps.getContractHashFallback,
}))
vi.mock('../../domain/nodeMapper', () => ({
  normalizeNodePublicKey: deps.normalizeNodePublicKey,
}))

import {
  buildStakeAddressMap,
  buildVoteRoleFromVoter,
  describeVoteError,
  getRequiredVoteContractHash,
  isVoteVoterRecord,
  mapGovernanceVoters,
  mapVoteRecords,
  normalizeVoteVoters,
  resolveVoteAddress,
  resolveVoteContractHash,
} from './voteTopicShared'

beforeEach(() => {
  vi.clearAllMocks()
  deps.deriveAddressFromPublicKey.mockImplementation(async (pk: string) => 'addr-' + pk)
  deps.normalizeNodePublicKey.mockImplementation((s: { pk?: string }) => s?.pk || 'pk')
})

describe('isVoteVoterRecord / normalizeVoteVoters', () => {
  it('detects records with a string address', () => {
    expect(isVoteVoterRecord({ address: 'a' })).toBe(true)
    expect(isVoteVoterRecord({ address: 1 })).toBe(false)
    expect(isVoteVoterRecord(null)).toBe(false)
  })

  it('filters out non-voter records', () => {
    expect(normalizeVoteVoters([{ address: 'a' }, null, { foo: 1 }])).toEqual([{ address: 'a' }])
  })
})

describe('describeVoteError', () => {
  it('describes nullish, Error, string, object and circular values', () => {
    expect(describeVoteError(null)).toBe('Unknown error')
    expect(describeVoteError(new Error('boom'))).toBe('boom')
    expect(describeVoteError('oops')).toBe('oops')
    expect(describeVoteError({ a: 1 })).toBe('{"a":1}')
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(typeof describeVoteError(circular)).toBe('string')
  })
})

describe('resolveVoteAddress', () => {
  it('prefers an explicit address then the wallet address', () => {
    expect(resolveVoteAddress({ address: 'w' } as never, 'a')).toBe('a')
    expect(resolveVoteAddress({ address: 'w' } as never)).toBe('w')
    expect(resolveVoteAddress(undefined, '')).toBe('')
  })
})

describe('resolveVoteContractHash', () => {
  it('returns the provided hash as cached', async () => {
    const result = await resolveVoteContractHash({ contractHash: 'h', network: 'M' as never })
    expect(result).toMatchObject({ ok: true, contractHash: 'h', cached: true })
  })

  it('uses the fetched contract address', async () => {
    deps.fetchVoteContractAddress.mockResolvedValue({ vote_contract_address: 'fetched' })
    const result = await resolveVoteContractHash({ network: 'M' as never })
    expect(result).toMatchObject({ ok: true, contractHash: 'fetched', usedFallback: false })
  })

  it('falls back when no address is returned', async () => {
    deps.fetchVoteContractAddress.mockResolvedValue({})
    deps.getContractHashFallback.mockReturnValue('fallback')
    const result = await resolveVoteContractHash({ network: 'M' as never })
    expect(result).toMatchObject({ ok: true, contractHash: 'fallback', usedFallback: true })
  })

  it('falls back to the contract hash on error', async () => {
    deps.fetchVoteContractAddress.mockRejectedValue(new Error('boom'))
    deps.getContractHashFallback.mockReturnValue('fallback')
    const result = await resolveVoteContractHash({ network: 'M' as never })
    expect(result).toMatchObject({ ok: true, contractHash: 'fallback', usedFallback: true })
  })

  it('reports failure when no fallback exists after an error', async () => {
    deps.fetchVoteContractAddress.mockRejectedValue(new Error('boom'))
    deps.getContractHashFallback.mockReturnValue('')
    const result = await resolveVoteContractHash({ network: 'M' as never })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr', contractHash: '' })
  })
})

describe('getRequiredVoteContractHash', () => {
  it('throws when the contract hash is unavailable', async () => {
    deps.fetchVoteContractAddress.mockResolvedValue({})
    deps.getContractHashFallback.mockReturnValue('')
    await expect(getRequiredVoteContractHash({ network: 'M' as never })).rejects.toThrow(
      'Vote contract hash is unavailable'
    )
  })

  it('returns the resolved hash', async () => {
    const result = await getRequiredVoteContractHash({ contractHash: 'h', network: 'M' as never })
    expect(result.contractHash).toBe('h')
  })
})

describe('buildStakeAddressMap', () => {
  it('maps derived addresses to name and weight', async () => {
    const map = await buildStakeAddressMap([
      { pk: 'k1', name: 'Node1', currentStake: 5 },
      { pk: 'k2', current_stake: 7 },
    ])
    expect(map.get('addr-k1')).toEqual({ name: 'Node1', weight: 5 })
    expect(map.get('addr-k2')).toEqual({ name: '', weight: 7 })
  })
})

describe('mapGovernanceVoters', () => {
  it('enriches voters with stake name and weight when matched', () => {
    const map = new Map([['abcdef123456', { name: 'Matched', weight: 99 }]])
    const result = mapGovernanceVoters([{ address: 'abcdef123456' }], map)
    expect(result[0]).toMatchObject({ name: 'Matched', weight: 99 })
  })

  it('falls back to a truncated address and existing weight when unmatched', () => {
    const result = mapGovernanceVoters([{ address: 'abcdef123456', weight: 3 }])
    expect(result[0]).toMatchObject({ name: 'abcdef12', weight: 3 })
  })
})

describe('mapVoteRecords', () => {
  it('attaches the matching voter name', () => {
    const result = mapVoteRecords(
      [{ address: 'a' }, { address: 'b' }],
      [{ address: 'a', name: 'A' }]
    )
    expect(result[0]).toMatchObject({ address: 'a', name: 'A' })
    expect(result[1]).toMatchObject({ address: 'b', name: '' })
  })
})

describe('buildVoteRoleFromVoter', () => {
  it('returns voter+admin roles for a voter, empty otherwise', () => {
    expect(buildVoteRoleFromVoter({ address: 'a' } as never)).toEqual(['voter', 'admin'])
    expect(buildVoteRoleFromVoter(null)).toEqual([])
  })
})
