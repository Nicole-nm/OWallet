/**
 * voteStatusCalculator.ts
 *
 * Eligibility and status computation for governance vote topics.
 * All functions are pure — no I/O, no SDK dependency.
 */

import { VOTE_STATUS, VOTE_STATUS_TEXT } from './types'
import type { VoteRecord, VoteStatusText } from './types'

// ---------------------------------------------------------------------------
// Status text derivation
// ---------------------------------------------------------------------------

/**
 * Derive the human-readable status label for a vote given the current time.
 *
 * @param vote - Object with `status`, `startTime` and `endTime` (all in ms).
 * @param nowMs - Current epoch milliseconds (default: `Date.now()`).
 */
export function deriveVoteStatusText(
  vote: Pick<VoteRecord, 'status' | 'startTime' | 'endTime'>,
  nowMs = Date.now()
): VoteStatusText {
  if (vote.status === VOTE_STATUS.CANCELED) {
    return VOTE_STATUS_TEXT.CANCELED
  }
  if (vote.startTime > nowMs) {
    return VOTE_STATUS_TEXT.NOT_START
  }
  if (vote.startTime <= nowMs && vote.endTime >= nowMs) {
    return VOTE_STATUS_TEXT.IN_PROGRESS
  }
  return VOTE_STATUS_TEXT.FINISHED
}

// ---------------------------------------------------------------------------
// Participation eligibility
// ---------------------------------------------------------------------------

/**
 * Determine whether an address is eligible to vote in a topic.
 *
 * An address is eligible when:
 *  - the topic is currently IN_PROGRESS, and
 *  - the address appears in the `voters` list of the topic.
 *
 * @param vote     - The vote topic, including its `voters` list.
 * @param address  - Base58 address of the potential voter.
 * @param nowMs    - Current epoch milliseconds (default: `Date.now()`).
 */
export function isEligibleToVote(vote: VoteRecord, address: string, nowMs = Date.now()): boolean {
  const statusText = deriveVoteStatusText(vote, nowMs)
  if (statusText !== VOTE_STATUS_TEXT.IN_PROGRESS) {
    return false
  }
  return vote.voters.some((v) => v.address === address)
}

// ---------------------------------------------------------------------------
// Admin eligibility
// ---------------------------------------------------------------------------

/**
 * Determine whether an address is the admin of a vote topic.
 */
export function isVoteAdmin(vote: Pick<VoteRecord, 'admin'>, address: string): boolean {
  return vote.admin === address
}

/**
 * Determine whether an admin can still cancel a topic.
 *
 * Cancellation is only allowed while the vote has not yet started or is
 * in-progress (i.e. not yet finished or already cancelled).
 */
export function canCancelVote(vote: VoteRecord, address: string, nowMs = Date.now()): boolean {
  if (!isVoteAdmin(vote, address)) return false
  const statusText = deriveVoteStatusText(vote, nowMs)
  return statusText === VOTE_STATUS_TEXT.NOT_START || statusText === VOTE_STATUS_TEXT.IN_PROGRESS
}

// ---------------------------------------------------------------------------
// Result computation
// ---------------------------------------------------------------------------

/**
 * Return the total weight that has voted (approves + rejects).
 */
export function totalVotedWeight(vote: Pick<VoteRecord, 'approves' | 'rejects'>): number {
  return vote.approves + vote.rejects
}

/**
 * Return the total weight of all eligible voters registered for the topic.
 */
export function totalVoterWeight(vote: Pick<VoteRecord, 'voters'>): number {
  return vote.voters.reduce((sum, v) => sum + v.weight, 0)
}

/**
 * Return the approval ratio as a number in [0, 1].
 * Returns 0 when no votes have been cast.
 */
export function approvalRatio(vote: Pick<VoteRecord, 'approves' | 'rejects'>): number {
  const total = totalVotedWeight(vote)
  if (total === 0) return 0
  return vote.approves / total
}
