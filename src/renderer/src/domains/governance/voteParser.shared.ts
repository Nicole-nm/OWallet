import type { VoteRecord } from './types'
import { deriveVoteStatusText } from './voteStatusCalculator'
import { ADDRESS_BYTES, HASH_BYTES } from './constants'

export const VOTE_ADDRESS_BYTES = ADDRESS_BYTES
export const VOTE_HASH_BYTES = HASH_BYTES

export function formatNumber(
  val: string,
  utils: { reverseHex: (value: string) => string }
): number {
  return parseInt(utils.reverseHex(val), 16)
}

export function toVoteNumber(value: number | bigint): number {
  return Number(value)
}

export function applyStatusText(
  vote: Pick<VoteRecord, 'status' | 'startTime' | 'endTime'> & { statusText?: string },
  nowMs = Date.now()
): void {
  vote.statusText = deriveVoteStatusText(vote, nowMs)
}
