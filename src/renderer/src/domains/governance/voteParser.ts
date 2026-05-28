/**
 * voteParser.ts
 *
 * Pure binary / hex protocol parsing for governance vote topics.
 * All functions are synchronous and operate only on data already in memory —
 * no network calls, no SDK lazy-loads.
 */

import type { VoteRecord, VoteVoter, VoteParticipationRecord } from './types'
import { deriveVoteStatusText } from './voteStatusCalculator'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Reverse a hex string and interpret it as a little-endian integer. */
export function formatNumber(val: string, utils: { reverseHex: (v: string) => string }): number {
  return parseInt(utils.reverseHex(val), 16)
}

/**
 * Attach a human-readable `statusText` field to a vote based on its status + timestamps.
 * @param nowMs - Current epoch milliseconds (default: Date.now()). Pass a fixed value in tests.
 */
export function applyStatusText(
  vote: Pick<VoteRecord, 'status' | 'startTime' | 'endTime'> & { statusText?: string },
  nowMs = Date.now()
): void {
  vote.statusText = deriveVoteStatusText(vote, nowMs)
}

// ---------------------------------------------------------------------------
// Named offsets for the new binary vote struct
// (each field size in bytes as read by the StringReader methods)
// ---------------------------------------------------------------------------

/** Byte length of an Ontology address in binary form. */
const ADDR_BYTES = 20

/** Byte length of an H256 hash field. */
const HASH_BYTES = 32

// ---------------------------------------------------------------------------
// StringReader interface (subset used here — implemented by ontology-ts-sdk)
// ---------------------------------------------------------------------------

export interface VoteStringReader {
  readVarUint: () => number
  read: (len: number) => string
  readUint128: () => number
  readUint64: () => number
  readUint8: () => number
  readH256: () => string
  readBoolean?: () => boolean
}

export interface VoteCrypto {
  Address: new (addr: string) => { toBase58: () => string }
}

export interface VoteUtils {
  StringReader: new (data: string) => VoteStringReader
  hexstr2str: (hex: string) => string
  reverseHex: (v: string) => string
}

export interface VoteSdkContext {
  Crypto: VoteCrypto
  utils: VoteUtils
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Parse a binary-encoded new-format vote topic from the WASM contract.
 *
 * Returns `null` if the data indicates no value (hasValue === 0).
 * Throws on malformed / truncated buffers — callers should catch.
 */
export function parseNewVoteInfo(
  data: string,
  { Crypto, utils }: VoteSdkContext
): VoteRecord | null {
  const sr = new utils.StringReader(data)

  const hasValue = sr.readVarUint() > 0
  if (!hasValue) {
    return null
  }

  const admin = new Crypto.Address(sr.read(ADDR_BYTES)).toBase58()

  const topicTitleLength = sr.readVarUint()
  const title = utils.hexstr2str(sr.read(topicTitleLength))

  const topicDetailLength = sr.readVarUint()
  const content = utils.hexstr2str(sr.read(topicDetailLength))

  const votersLength = sr.readVarUint()
  const voters: VoteVoter[] = []
  for (let i = 0; i < votersLength; i++) {
    const voterAddr = new Crypto.Address(sr.read(ADDR_BYTES)).toBase58()
    const weight = sr.readUint128()
    voters.push({ address: voterAddr, weight })
  }

  const startTime = sr.readUint64() * 1000 // seconds → milliseconds
  const endTime = sr.readUint64() * 1000 // seconds → milliseconds
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

/**
 * Parse an old-format vote topic from the NeoVM contract.
 *
 * The old contract returns an array of string-encoded fields.
 * `arrayItem` must have the shape: [adminHex, titleHex, contentHex, votersArray, startHex, endHex, approvesHex, rejectsHex, statusHex, hash].
 */
export function parseOldVoteInfo(
  arrayItem: string[],
  utils: VoteUtils,
  Crypto: VoteCrypto
): VoteRecord {
  // timestamps may arrive as seconds (10 digits) or milliseconds (13 digits)
  const toMs = (hexVal: string): number => {
    const n = formatNumber(hexVal, utils)
    return String(n).length <= 10 ? n * 1000 : n
  }

  const vote: VoteRecord = {
    admin: new Crypto.Address(arrayItem[0] as string).toBase58(),
    title: utils.hexstr2str(arrayItem[1] as string),
    content: utils.hexstr2str(arrayItem[2] as string),
    voters: arrayItem[3]
      ? (arrayItem[3] as unknown as string[][]).map((i: string[]) => ({
          address: new Crypto.Address(i[0] as string).toBase58(),
          weight: formatNumber(i[1] as string, utils),
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

/**
 * Parse a batch of binary-encoded new-format vote topics.
 *
 * Items that fail to parse are silently skipped (callers log the warning).
 */
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

/**
 * Parse a batch of old-format vote topic results.
 *
 * Each item may be a raw API response envelope `{ Result: { Result: string[] } }`
 * or already an unwrapped `string[]`.
 */
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
    const arrayItem = item as string[]
    votes.push(parseOldVoteInfo(arrayItem, utils, Crypto))
  }
  return votes
}

/**
 * Parse the vote result for a single address from the `getVotedInfo` response.
 *
 * Returns 'APPROVED', 'REJECTED', or 'NOT_VOTED'.
 */
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

/** Extended StringReader that includes the `readBoolean` method (available in the full SDK). */
export interface VoteStringReaderWithBoolean extends VoteStringReader {
  readBoolean: () => boolean
}

/** Extended VoteUtils whose StringReader produces `VoteStringReaderWithBoolean`. */
export interface VoteUtilsWithBoolean extends VoteUtils {
  StringReader: new (data: string) => VoteStringReaderWithBoolean
}

/**
 * Parse the list of voted address records from the `getVotedAddress` response.
 */
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
      const address = new Crypto.Address(sr.read(ADDR_BYTES)).toBase58()
      const weight = sr.readUint64()
      const isApproval = sr.readBoolean()
      records.push({ address, weight, isApproval })
    }
  }
  return records
}

/**
 * Parse the governance node list from the `listGovNodes` response.
 */
export function parseGovNodes(
  hexData: string,
  utils: VoteUtils,
  Crypto: VoteCrypto
): Array<{ name: string; weight: number; address: string }> {
  const sr = new utils.StringReader(hexData)
  const length = sr.readVarUint()
  const nodes: { name: string; weight: number; address: string }[] = []
  for (let i = 0; i < length; i++) {
    nodes.push({ name: '', weight: 0, address: new Crypto.Address(sr.read(ADDR_BYTES)).toBase58() })
  }
  return nodes
}

/**
 * Parse the topic hash list from the `listTopics` response.
 */
export function parseTopicHashes(hexData: string, utils: VoteUtils): string[] {
  const sr = new utils.StringReader(hexData)
  const length = sr.readVarUint()
  const hashes: string[] = []
  for (let i = 0; i < length; i++) {
    hashes.push(sr.read(HASH_BYTES))
  }
  return hashes
}

/**
 * Parse a single voter entry from the `getVoters` response array item.
 */
export function parseVoterEntry(
  i: string[],
  utils: VoteUtils,
  Crypto: VoteCrypto
): { address: string; weight: number } {
  return {
    address: new Crypto.Address(i[0] as string).toBase58(),
    weight: parseInt(utils.reverseHex(i[1] as string), 16),
  }
}
