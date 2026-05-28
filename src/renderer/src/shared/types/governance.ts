export interface GovernanceNode {
  pk: string
  peerPubkey: string
  publicKey: string
  nodePublicKey: string
  public_key: string
  publickey: string
  name: string
  nodeAddress: string
  maxAuthorize: number
  maxAuthorizeStr: string
  totalPos: number
  totalPosStr: string
  status?: number
  [key: string]: unknown
}

export interface AuthorizationPeer {
  peerPubkey: string
  address: string
  status: number
  initPos: number
  initPosStr: string
  totalPos: number
  totalPosStr: string
}

export interface PeerAttributes {
  peerPubkey: string
  maxAuthorize: number
  maxAuthorizeStr: string
  t2PeerCost: number
  t1PeerCost: number
  tPeerCost: number
  t2StakeCost: number
  t1StakeCost: number
  tStakeCost: number
}

export interface AuthorizationInfo {
  consensusPos: number
  freezePos: number
  newPos: number
  withdrawPos: number
  withdrawFreezePos: number
  withdrawUnfreezePos: number
  inAuthorization: string
  locked: string
  claimable: string
  claimableVal: number
  newStakePortion: string
  receiveProfitPortion: string
}

export interface SplitFee {
  address: string
  amount: number | string
}

export interface StakeDetail {
  pk: string
  peerPubkey: string
  publicKey: string
  nodePublicKey: string
  name: string
  nodeAddress: string
  ontid: string
  contract: string
  stakeWalletAddress: string
  commitmentQuantity: number
  transactionHash: string
  status: number
}

export interface VoteTopic {
  topicHash: string
  admin: string
  topic: string
  startTime: number | string
  endTime: number | string
  voters: number
  approve: number
  reject: number
  status: number
  [key: string]: unknown
}

export interface GovernanceVoter {
  address: string
  name?: string
  weight?: number
  [key: string]: unknown
}

export interface GovernanceVoteRecord {
  address: string
  name?: string
  [key: string]: unknown
}
