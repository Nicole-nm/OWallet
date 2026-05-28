/**
 * Governance domain types.
 *
 * Re-exports shared types that are used across governance sub-services, and
 * defines governance-specific shapes that do not belong in shared/.
 */

// ---------------------------------------------------------------------------
// Re-exports from shared (keeps import paths short inside this domain)
// ---------------------------------------------------------------------------
export type { AuthorizationInfo, NodeInfo } from '../../shared/lib/types'

// ---------------------------------------------------------------------------
// Vote / topic
// ---------------------------------------------------------------------------

export interface VoteVoter {
  address: string
  weight: number
}

export interface VoteRecord {
  admin: string
  title: string
  content: string
  voters: VoteVoter[]
  startTime: number
  endTime: number
  approves: number
  rejects: number
  status: number
  hash: string
  statusText?: string
}

export interface VoteParticipationRecord {
  address: string
  weight: number
  isApproval: boolean
}

// ---------------------------------------------------------------------------
// Peer pool / governance storage
// ---------------------------------------------------------------------------

export interface PeerPoolEntry {
  index: number
  peerPubkey: string
  address: string
  status: number
  initPos: number
  totalPos: number
}

export interface PeerAttributes {
  peerPubkey: string
  maxAuthorize: number
  t2PeerCost: number
  t1PeerCost: number
  tPeerCost: number
  t2StakeCost: number
  t1StakeCost: number
  tStakeCost: number
}

export interface SplitFeeAddress {
  address: unknown
  amount: number | string
}

export interface GlobalParam {
  candidateFee: number
  minInitState: number
  candidateNum: number
  posLimit: number
  A: number
  B: number
  yita: number
  penalty: number
}

// ---------------------------------------------------------------------------
// Stake history
// ---------------------------------------------------------------------------

/**
 * A single entry in the user's stake-history list, returned by
 * `searchUserStakeHistory`.  Each entry represents the caller's authorization
 * position at one governance node.
 *
 * The numeric pos fields are formatted locale strings (e.g. "1,000") so they
 * are ready for display; `claimableVal` is the raw number kept for computation.
 */
export interface StakeHistoryEntry {
  /** Node display name (falls back to "Node_<pubkey prefix>" when unnamed). */
  name: string
  /** Full peer public key of the node. */
  nodePublicKey: string
  /** Legacy node public-key field kept for existing UI/store consumers. */
  pk: string
  /** The staking wallet address. */
  stakeWallet: string
  /** Total amount currently authorised to the node (formatted string). */
  inAuthorization: string | number
  /** Amount locked / pending withdrawal (formatted string). */
  locked: string | number
  /** Claimable amount (formatted string). */
  claimable: string | number
  /** Raw claimable amount (number), kept for computation. */
  claimableVal: number
  /** New stake portion awaiting consensus (formatted string). */
  newStakePortion: string | number
  /** Amount already receiving profit (formatted string). */
  receiveProfitPortion: string | number
}

// ---------------------------------------------------------------------------
// Vote status constants
// ---------------------------------------------------------------------------

export const VOTE_STATUS = {
  CANCELED: 0,
} as const

export const VOTE_STATUS_TEXT = {
  NOT_START: 'NOT_START',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
  CANCELED: 'CANCELED',
} as const

export type VoteStatusText = (typeof VOTE_STATUS_TEXT)[keyof typeof VOTE_STATUS_TEXT]
