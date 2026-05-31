import type { VoteRecord, VoteVoter } from './types'
import { applyStatusText, VOTE_ADDRESS_BYTES } from './voteParser.shared'
import type { VoteSdkContext } from './voteParser.types'

export function parseNewVoteInfo(
  data: string,
  { Crypto, utils }: VoteSdkContext
): VoteRecord | null {
  const sr = new utils.StringReader(data)

  const hasValue = sr.readVarUint() > 0
  if (!hasValue) {
    return null
  }

  const admin = new Crypto.Address(sr.read(VOTE_ADDRESS_BYTES)).toBase58()

  const topicTitleLength = sr.readVarUint()
  const title = utils.hexstr2str(sr.read(topicTitleLength))

  const topicDetailLength = sr.readVarUint()
  const content = utils.hexstr2str(sr.read(topicDetailLength))

  const votersLength = sr.readVarUint()
  const voters: VoteVoter[] = []
  for (let i = 0; i < votersLength; i++) {
    const voterAddr = new Crypto.Address(sr.read(VOTE_ADDRESS_BYTES)).toBase58()
    const weight = sr.readUint128()
    voters.push({ address: voterAddr, weight })
  }

  const startTime = sr.readUint64() * 1000
  const endTime = sr.readUint64() * 1000
  const approves = sr.readUint64()
  const rejects = sr.readUint64()
  const status = sr.readUint8()
  const hash = sr.readH256()

  const vote: VoteRecord = {
    admin,
    title,
    content,
    voters,
    startTime,
    endTime,
    approves,
    rejects,
    status,
    hash,
  }
  applyStatusText(vote)
  return vote
}

export function parseNewVoteInfoBatch(
  infos: string[],
  ctx: VoteSdkContext,
  onError?: (err: unknown) => void
): VoteRecord[] {
  const votes: VoteRecord[] = []
  for (const data of infos) {
    try {
      const vote = parseNewVoteInfo(data, ctx)
      if (vote) votes.push(vote)
    } catch (err: unknown) {
      onError?.(err)
    }
  }
  return votes
}
