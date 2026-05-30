import { beforeEach, describe, expect, it, vi } from 'vitest'

const domain = vi.hoisted(() => ({
  fetchCurrentStakes: vi.fn(),
  queryGovNodes: vi.fn(),
  queryOldTopicInfos: vi.fn(),
  queryTopicHashes: vi.fn(),
  queryTopicInfo: vi.fn(),
  queryTopicInfos: vi.fn(),
  queryVotedInfo: vi.fn(),
  queryVotedRecords: vi.fn(),
  queryVoters: vi.fn(),
}))

const shared = vi.hoisted(() => ({
  buildStakeAddressMap: vi.fn(async () => ({})),
  buildVoteRoleFromVoter: vi.fn(() => ['admin']),
  getRequiredVoteContractHash: vi.fn(async () => ({ contractHash: 'resolved' })),
  mapGovernanceVoters: vi.fn((voters: unknown[]) => voters),
  mapVoteRecords: vi.fn((records: unknown[]) => records),
  NETWORK_ERROR_KEY: 'common.networkErr',
  normalizeVoteVoters: vi.fn((voters: unknown[]) => voters),
  resolveVoteAddress: vi.fn((_wallet: unknown, address: string) => address),
  voteTopicLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../../domains/governance/voteService', () => domain)
vi.mock('./voteTopicShared', () => ({
  ...shared,
  isVoteVoterRecord: vi.fn(),
}))

import {
  isVoteVoter,
  loadVoteDetail,
  loadVoteList,
  loadVoteRole,
  loadVoteVoters,
  syncAdminVotes,
} from './voteQueryService'

beforeEach(() => {
  vi.clearAllMocks()
  shared.getRequiredVoteContractHash.mockResolvedValue({ contractHash: 'resolved' })
  shared.buildVoteRoleFromVoter.mockReturnValue(['admin'])
  shared.mapGovernanceVoters.mockImplementation((voters: unknown[]) => voters)
  shared.normalizeVoteVoters.mockImplementation((voters: unknown[]) => voters)
  shared.resolveVoteAddress.mockImplementation((_w: unknown, address: string) => address)
})

describe('loadVoteRole', () => {
  it('resolves the current voter weight and role', async () => {
    domain.fetchCurrentStakes.mockResolvedValue([])
    domain.queryGovNodes.mockResolvedValue([{ address: 'me', weight: 42 }])

    const result = await loadVoteRole({ network: 'MAIN_NET' as never, address: 'me' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.myWeight).toBe(42)
      expect(result.role).toEqual(['admin'])
    }
  })

  it('returns a network error when a query throws', async () => {
    domain.fetchCurrentStakes.mockRejectedValue(new Error('boom'))
    domain.queryGovNodes.mockResolvedValue([])
    const result = await loadVoteRole({ network: 'MAIN_NET' as never, address: 'me' })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr' })
  })
})

describe('loadVoteList', () => {
  it('appends old topics for hashes missing from the new list', async () => {
    domain.queryTopicHashes.mockResolvedValue(['h1', 'h2'])
    domain.queryTopicInfos.mockResolvedValue([{ hash: 'h1' }])
    domain.queryOldTopicInfos.mockResolvedValue([{ hash: 'h2' }])

    const result = await loadVoteList({ network: 'MAIN_NET' as never })
    expect(domain.queryOldTopicInfos).toHaveBeenCalledWith('MAIN_NET', ['h2'])
    if (result.ok) expect(result.votes).toHaveLength(2)
  })

  it('skips the old-topic query when all hashes are present', async () => {
    domain.queryTopicHashes.mockResolvedValue(['h1'])
    domain.queryTopicInfos.mockResolvedValue([{ hash: 'h1' }])
    await loadVoteList({ network: 'MAIN_NET' as never })
    expect(domain.queryOldTopicInfos).not.toHaveBeenCalled()
  })
})

describe('syncAdminVotes', () => {
  it('filters votes by admin address', () => {
    const result = syncAdminVotes({
      allVotes: [{ admin: 'me' }, { admin: 'other' }],
      address: 'me',
    })
    expect(result.votes).toEqual([{ admin: 'me' }])
  })

  it('returns an empty list without an address', () => {
    expect(syncAdminVotes({ allVotes: [{ admin: 'me' }] }).votes).toEqual([])
  })
})

describe('loadVoteVoters', () => {
  it('returns voters for a topic', async () => {
    domain.queryVoters.mockResolvedValue([{ address: 'v1' }])
    const result = await loadVoteVoters({ network: 'MAIN_NET' as never, hash: 'h1' })
    if (result.ok) expect(result.voters).toEqual([{ address: 'v1' }])
  })

  it('returns an empty voter list on failure', async () => {
    domain.queryVoters.mockRejectedValue(new Error('boom'))
    const result = await loadVoteVoters({ network: 'MAIN_NET' as never, hash: 'h1' })
    expect(result).toMatchObject({ ok: false, voters: [] })
  })
})

describe('isVoteVoter', () => {
  it('detects a matching voter address', () => {
    expect(isVoteVoter({ allVoters: [{ address: 'me' }], address: 'me' })).toBe(true)
    expect(isVoteVoter({ allVoters: [{ address: 'other' }], address: 'me' })).toBe(false)
  })
})

describe('loadVoteDetail', () => {
  it('queries voted info when an address resolves', async () => {
    domain.queryVotedInfo.mockResolvedValue('VOTED')
    domain.queryTopicInfo.mockResolvedValue({ hash: 'h1' })
    domain.queryVotedRecords.mockResolvedValue([])

    const result = await loadVoteDetail({
      network: 'MAIN_NET' as never,
      hash: 'h1',
      address: 'me',
    })
    expect(domain.queryVotedInfo).toHaveBeenCalled()
    if (result.ok) expect(result.myVoted).toBe('VOTED')
  })

  it('returns NOT_VOTED when no address resolves', async () => {
    shared.resolveVoteAddress.mockReturnValue('')
    domain.queryTopicInfo.mockResolvedValue({ hash: 'h1' })
    domain.queryVotedRecords.mockResolvedValue([])

    const result = await loadVoteDetail({ network: 'MAIN_NET' as never, hash: 'h1' })
    expect(domain.queryVotedInfo).not.toHaveBeenCalled()
    if (result.ok) expect(result.myVoted).toBe('NOT_VOTED')
  })
})
