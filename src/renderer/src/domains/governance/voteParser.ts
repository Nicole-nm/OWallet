/**
 * voteParser — public barrel for the vote-record parsers.
 *
 * Wire-format parsers live in their own modules:
 *   - voteParser.binary   (new WASM-VM contract responses)
 *   - voteParser.legacy   (old array-based RPC responses)
 *   - voteParser.records  (voted result/records, gov nodes, topic hashes, voters)
 *   - voteParser.shared   (shared number/status helpers + byte-length constants)
 */

export { parseNewVoteInfo, parseNewVoteInfoBatch } from './voteParser.binary'
export { parseOldVoteInfo, parseOldVoteInfoBatch } from './voteParser.legacy'
export {
  parseVotedResult,
  parseVotedRecords,
  parseGovNodes,
  parseTopicHashes,
  parseVoterEntry,
} from './voteParser.records'
export {
  applyStatusText,
  formatNumber,
  toVoteNumber,
  VOTE_ADDRESS_BYTES,
  VOTE_HASH_BYTES,
} from './voteParser.shared'
export type {
  VoteCrypto,
  VoteSdkContext,
  VoteStringReader,
  VoteStringReaderWithBoolean,
  VoteUtils,
  VoteUtilsWithBoolean,
} from './voteParser.types'
