import { describe, it, expect } from 'vitest'
import {
  deriveVoteStatusText,
  isEligibleToVote,
  isVoteAdmin,
  canCancelVote,
  totalVotedWeight,
  totalVoterWeight,
  approvalRatio,
} from './voteStatusCalculator'
import type { VoteRecord } from './types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000 // a fixed epoch ms for deterministic tests

function makeVote(overrides: Partial<VoteRecord> = {}): VoteRecord {
  return {
    admin: 'adminAddr',
    title: 'Test',
    content: 'Content',
    voters: [
      { address: 'voterA', weight: 50 },
      { address: 'voterB', weight: 30 },
    ],
    startTime: NOW - 100_000,
    endTime: NOW + 100_000,
    approves: 0,
    rejects: 0,
    status: 1,
    hash: 'abc',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// deriveVoteStatusText
// ---------------------------------------------------------------------------

describe('deriveVoteStatusText', () => {
  it('returns CANCELED when status is 0', () => {
    const vote = makeVote({ status: 0 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('CANCELED')
  })

  it('returns NOT_START when startTime > now', () => {
    const vote = makeVote({ startTime: NOW + 1, endTime: NOW + 200_000 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('NOT_START')
  })

  it('returns NOT_START when startTime is exactly one ms in the future', () => {
    const vote = makeVote({ startTime: NOW + 1, endTime: NOW + 100_000 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('NOT_START')
  })

  it('returns IN_PROGRESS when startTime === now (boundary)', () => {
    const vote = makeVote({ startTime: NOW, endTime: NOW + 100_000 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('IN_PROGRESS')
  })

  it('returns IN_PROGRESS when now is within the vote window', () => {
    const vote = makeVote({ startTime: NOW - 1, endTime: NOW + 1 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('IN_PROGRESS')
  })

  it('returns IN_PROGRESS when endTime === now (boundary)', () => {
    const vote = makeVote({ startTime: NOW - 100_000, endTime: NOW })
    expect(deriveVoteStatusText(vote, NOW)).toBe('IN_PROGRESS')
  })

  it('returns FINISHED when endTime < now', () => {
    const vote = makeVote({ startTime: NOW - 200_000, endTime: NOW - 1 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('FINISHED')
  })

  it('returns FINISHED when endTime is exactly one ms in the past', () => {
    const vote = makeVote({ endTime: NOW - 1 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('FINISHED')
  })

  it('ignores time fields when status is 0 (canceled overrides everything)', () => {
    // Even if the vote is technically in-progress, status=0 → CANCELED
    const vote = makeVote({ status: 0, startTime: NOW - 1, endTime: NOW + 1 })
    expect(deriveVoteStatusText(vote, NOW)).toBe('CANCELED')
  })
})

// ---------------------------------------------------------------------------
// isEligibleToVote
// ---------------------------------------------------------------------------

describe('isEligibleToVote', () => {
  it('returns true for a voter in an in-progress vote', () => {
    const vote = makeVote()
    expect(isEligibleToVote(vote, 'voterA', NOW)).toBe(true)
  })

  it('returns false for an address NOT in the voters list', () => {
    const vote = makeVote()
    expect(isEligibleToVote(vote, 'stranger', NOW)).toBe(false)
  })

  it('returns false when the vote has not started yet', () => {
    const vote = makeVote({ startTime: NOW + 1, endTime: NOW + 100_000 })
    expect(isEligibleToVote(vote, 'voterA', NOW)).toBe(false)
  })

  it('returns false when the vote is finished', () => {
    const vote = makeVote({ startTime: NOW - 200_000, endTime: NOW - 1 })
    expect(isEligibleToVote(vote, 'voterA', NOW)).toBe(false)
  })

  it('returns false when the vote is canceled (status=0)', () => {
    const vote = makeVote({ status: 0 })
    expect(isEligibleToVote(vote, 'voterA', NOW)).toBe(false)
  })

  it('returns false for a voter that is one below the threshold (not in list)', () => {
    // All voters: only voterA and voterB
    const vote = makeVote({ voters: [{ address: 'voterA', weight: 1 }] })
    expect(isEligibleToVote(vote, 'voterB', NOW)).toBe(false)
  })

  it('handles empty voter list gracefully', () => {
    const vote = makeVote({ voters: [] })
    expect(isEligibleToVote(vote, 'voterA', NOW)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isVoteAdmin
// ---------------------------------------------------------------------------

describe('isVoteAdmin', () => {
  it('returns true for the admin address', () => {
    expect(isVoteAdmin({ admin: 'adminAddr' }, 'adminAddr')).toBe(true)
  })

  it('returns false for any other address', () => {
    expect(isVoteAdmin({ admin: 'adminAddr' }, 'notAdmin')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canCancelVote
// ---------------------------------------------------------------------------

describe('canCancelVote', () => {
  it('allows cancellation while in-progress by admin', () => {
    const vote = makeVote()
    expect(canCancelVote(vote, 'adminAddr', NOW)).toBe(true)
  })

  it('allows cancellation before start by admin', () => {
    const vote = makeVote({ startTime: NOW + 1, endTime: NOW + 100_000 })
    expect(canCancelVote(vote, 'adminAddr', NOW)).toBe(true)
  })

  it('denies cancellation after the vote has finished', () => {
    const vote = makeVote({ startTime: NOW - 200_000, endTime: NOW - 1 })
    expect(canCancelVote(vote, 'adminAddr', NOW)).toBe(false)
  })

  it('denies cancellation if already canceled', () => {
    const vote = makeVote({ status: 0 })
    expect(canCancelVote(vote, 'adminAddr', NOW)).toBe(false)
  })

  it('denies cancellation by a non-admin address', () => {
    const vote = makeVote()
    expect(canCancelVote(vote, 'voterA', NOW)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// totalVotedWeight
// ---------------------------------------------------------------------------

describe('totalVotedWeight', () => {
  it('sums approves and rejects', () => {
    expect(totalVotedWeight({ approves: 10, rejects: 4 })).toBe(14)
  })

  it('returns 0 when no votes cast', () => {
    expect(totalVotedWeight({ approves: 0, rejects: 0 })).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// totalVoterWeight
// ---------------------------------------------------------------------------

describe('totalVoterWeight', () => {
  it('sums all voter weights', () => {
    const vote = makeVote({
      voters: [
        { address: 'a', weight: 50 },
        { address: 'b', weight: 30 },
      ],
    })
    expect(totalVoterWeight(vote)).toBe(80)
  })

  it('returns 0 for empty voter list', () => {
    expect(totalVoterWeight({ voters: [] })).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// approvalRatio
// ---------------------------------------------------------------------------

describe('approvalRatio', () => {
  it('returns the ratio of approves to total', () => {
    expect(approvalRatio({ approves: 3, rejects: 1 })).toBeCloseTo(0.75)
  })

  it('returns 1 when all votes approve', () => {
    expect(approvalRatio({ approves: 5, rejects: 0 })).toBe(1)
  })

  it('returns 0 when no votes approve', () => {
    expect(approvalRatio({ approves: 0, rejects: 5 })).toBe(0)
  })

  it('returns 0 when no votes cast at all', () => {
    expect(approvalRatio({ approves: 0, rejects: 0 })).toBe(0)
  })
})
