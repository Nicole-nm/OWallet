import type { VoteRecord } from './types'
import { applyStatusText, formatNumber } from './voteParser.shared'
import type { VoteCrypto, VoteUtils } from './voteParser.types'

export function parseOldVoteInfo(
  arrayItem: unknown[],
  utils: VoteUtils,
  Crypto: VoteCrypto
): VoteRecord {
  const toMs = (hexVal: string): number => {
    const value = formatNumber(hexVal, utils)
    return String(value).length <= 10 ? value * 1000 : value
  }

  const vote: VoteRecord = {
    admin: new Crypto.Address(arrayItem[0] as string).toBase58(),
    title: utils.hexstr2str(arrayItem[1] as string),
    content: utils.hexstr2str(arrayItem[2] as string),
    voters: arrayItem[3]
      ? (arrayItem[3] as string[][]).map((item: string[]) => ({
          address: new Crypto.Address(item[0] as string).toBase58(),
          weight: formatNumber(item[1] as string, utils),
        }))
      : [],
    startTime: toMs(arrayItem[4] as string),
    endTime: toMs(arrayItem[5] as string),
    approves: formatNumber(arrayItem[6] as string, utils),
    rejects: formatNumber(arrayItem[7] as string, utils),
    status: formatNumber(arrayItem[8] as string, utils),
    hash: arrayItem[9] as string,
  }
  applyStatusText(vote)
  return vote
}

export function parseOldVoteInfoBatch(
  infos: unknown[],
  utils: VoteUtils,
  Crypto: VoteCrypto
): VoteRecord[] {
  const votes: VoteRecord[] = []
  for (const info of infos) {
    let item = info as { Result?: { Result?: string[] } } | string[]
    if (item && 'Result' in item && item.Result && item.Result.Result) {
      item = item.Result.Result as string[]
    }
    votes.push(parseOldVoteInfo(item as string[], utils, Crypto))
  }
  return votes
}
