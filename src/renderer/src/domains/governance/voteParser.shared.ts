import type { VoteRecord } from './types'
import { deriveVoteStatusText } from './voteStatusCalculator'

export const VOTE_ADDRESS_BYTES = 20
export const VOTE_HASH_BYTES = 32

export function formatNumber(
  val: string,
  utils: { reverseHex: (value: string) => string }
): number {
  return parseInt(utils.reverseHex(val), 16)
}

export function applyStatusText(
  vote: Pick<VoteRecord, 'status' | 'startTime' | 'endTime'> & { statusText?: string },
  nowMs = Date.now()
): void {
  vote.statusText = deriveVoteStatusText(vote, nowMs)
}
