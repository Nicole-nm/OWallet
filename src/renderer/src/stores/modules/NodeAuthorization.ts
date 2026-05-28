import { defineStore } from 'pinia'
import type {
  AuthorizationInfo,
  AuthorizationPeer,
  GovernanceNode,
  PeerAttributes,
  SplitFee,
} from '../../shared/types'

interface AuthorizationState {
  currentPeer: AuthorizationPeer
  peerAttributes: PeerAttributes
  currentNode: GovernanceNode
  authorizationInfo: AuthorizationInfo
  splitFee: SplitFee
  nodeList: GovernanceNode[]
  posLimit: number
  peerUnboundOng: number
  stakeHistory: Record<string, unknown>[]
  stakeAuthorizationWallet: string
  peerPoolMap: Record<string, unknown>[]
}

function createEmptyAuthorizationNode(): GovernanceNode {
  return {
    pk: '',
    peerPubkey: '',
    publicKey: '',
    nodePublicKey: '',
    public_key: '',
    publickey: '',
    name: '',
    nodeAddress: '',
    maxAuthorize: 0,
    maxAuthorizeStr: '0',
    totalPos: 0,
    totalPosStr: '0',
    status: 0,
  }
}

function createEmptyAuthorizationPeer(): AuthorizationPeer {
  return {
    peerPubkey: '',
    address: '',
    status: 0,
    initPos: 0,
    initPosStr: '0',
    totalPos: 0,
    totalPosStr: '0',
  }
}

function createEmptyAuthorizationPeerAttributes(): PeerAttributes {
  return {
    peerPubkey: '',
    maxAuthorize: 0,
    maxAuthorizeStr: '0',
    t2PeerCost: 0,
    t1PeerCost: 0,
    tPeerCost: 0,
    t2StakeCost: 0,
    t1StakeCost: 0,
    tStakeCost: 0,
  }
}

function createEmptyAuthorizationInfo(): AuthorizationInfo {
  return {
    consensusPos: 0,
    freezePos: 0,
    newPos: 0,
    withdrawPos: 0,
    withdrawFreezePos: 0,
    withdrawUnfreezePos: 0,
    inAuthorization: '0',
    locked: '0',
    claimable: '0',
    claimableVal: 0,
    newStakePortion: '0',
    receiveProfitPortion: '0',
  }
}

function createEmptySplitFee(): SplitFee {
  return { address: '', amount: 0 }
}

export const useNodeAuthorizationStore = defineStore('NodeAuthorization', {
  state: (): AuthorizationState => ({
    currentPeer: createEmptyAuthorizationPeer(),
    peerAttributes: createEmptyAuthorizationPeerAttributes(),
    currentNode: createEmptyAuthorizationNode(),
    authorizationInfo: createEmptyAuthorizationInfo(),
    splitFee: createEmptySplitFee(),
    nodeList: [],
    posLimit: 10,
    peerUnboundOng: 0,
    stakeHistory: [],
    stakeAuthorizationWallet: '',
    peerPoolMap: [],
  }),
  actions: {
    setCurrentNode(payload: { currentNode?: GovernanceNode } = {}) {
      this.currentNode = payload.currentNode || createEmptyAuthorizationNode()
    },
    setStakeAuthorizationWallet(payload: { stakeWallet?: string } = {}) {
      this.stakeAuthorizationWallet = payload.stakeWallet || ''
    },
    setCurrentPeer(payload: { peer?: AuthorizationPeer } = {}) {
      this.currentPeer = payload.peer || createEmptyAuthorizationPeer()
    },
    setPeerAttributes(payload: { peerAttributes?: PeerAttributes } = {}) {
      this.peerAttributes = payload.peerAttributes || createEmptyAuthorizationPeerAttributes()
    },
    setAuthorizationInfo(payload: { authorizationInfo?: AuthorizationInfo } = {}) {
      this.authorizationInfo = payload.authorizationInfo || createEmptyAuthorizationInfo()
    },
    setSplitFee(payload: { splitFee?: SplitFee } = {}) {
      this.splitFee = payload.splitFee || createEmptySplitFee()
    },
    setNodeList(payload: { nodes?: GovernanceNode[] } = {}) {
      this.nodeList = Array.isArray(payload.nodes) ? payload.nodes : []
    },
    setPosLimit(payload: { posLimit?: number } = {}) {
      this.posLimit = payload.posLimit ?? 10
    },
    setPeerUnboundOng(payload: { peerUnboundOng?: number } = {}) {
      this.peerUnboundOng = payload.peerUnboundOng ?? 0
    },
    setStakeHistory(payload: { stakeHistory?: Record<string, unknown>[] } = {}) {
      this.stakeHistory = Array.isArray(payload.stakeHistory) ? payload.stakeHistory : []
    },
    resetStakeHistory() {
      this.stakeHistory = []
    },
  },
})
