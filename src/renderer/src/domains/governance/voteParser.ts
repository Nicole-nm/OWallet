import type { VoteParticipationRecord } from './types'
import { VOTE_ADDRESS_BYTES, VOTE_HASH_BYTES } from './voteParser.shared'
import type {
  VoteCrypto,
  VoteUtils,
  VoteUtilsWithBoolean,
  VoteStringReaderWithBoolean,
} from './voteParser.types'

export * from './voteParser.new'
export * from './voteParser.old'
export * from './voteParser.shared'
export type * from './voteParser.types'

export function parseVotedResult(
  hexData: string,
  utils: VoteUtils
): 'APPROVED' | 'REJECTED' | 'NOT_VOTED' {
  const sr = new utils.StringReader(hexData)
  const result = sr.readVarUint()
  if (result === 1) return 'APPROVED'
  if (result === 2) return 'REJECTED'
  return 'NOT_VOTED'
}

export function parseVotedRecords(
  hexData: string,
  utils: VoteUtilsWithBoolean,
  Crypto: VoteCrypto
): VoteParticipationRecord[] {
  const sr: VoteStringReaderWithBoolean = new utils.StringReader(hexData)
  const length = sr.readVarUint()
  const records: VoteParticipationRecord[] = []
  if (length > 0) {
    for (let i = 0; i < length; i++) {
      const address = new Crypto.Address(sr.read(VOTE_ADDRESS_BYTES)).toBase58()
      const weight = sr.readUint64()
      const isApproval = sr.readBoolean()
      records.push({ address, weight, isApproval })
    }
  }
  return records
}

export function parseGovNodes(
  hexData: string,
  utils: VoteUtils,
  Crypto: VoteCrypto
): Array<{ name: string; weight: number; address: string }> {
  const sr = new utils.StringReader(hexData)
  const length = sr.readVarUint()
  const nodes: { name: string; weight: number; address: string }[] = []
  for (let i = 0; i < length; i++) {
    nodes.push({
      name: '',
      weight: 0,
      address: new Crypto.Address(sr.read(VOTE_ADDRESS_BYTES)).toBase58(),
    })
  }
  return nodes
}

export function parseTopicHashes(hexData: string, utils: VoteUtils): string[] {
  const sr = new utils.StringReader(hexData)
  const length = sr.readVarUint()
  const hashes: string[] = []
  for (let i = 0; i < length; i++) {
    hashes.push(sr.read(VOTE_HASH_BYTES))
  }
  return hashes
}

export function parseVoterEntry(
  item: string[],
  utils: VoteUtils,
  Crypto: VoteCrypto
): { address: string; weight: number } {
  return {
    address: new Crypto.Address(item[0] as string).toBase58(),
    weight: parseInt(utils.reverseHex(item[1] as string), 16),
  }
}
