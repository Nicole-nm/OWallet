import { formatNumberForDisplay } from '../../../shared/lib/numberFormat'
import { createEmptyFromTemplate } from '../../../shared/lib/factory'
import { mapOffChainNodeRecord } from './nodeMapper'

const EMPTY_AUTHORIZATION_NODE = {
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
}
const EMPTY_AUTHORIZATION_PEER = {
  peerPubkey: '',
  address: '',
  status: 0,
  initPos: 0,
  initPosStr: '0',
  totalPos: 0,
  totalPosStr: '0',
}
const EMPTY_AUTHORIZATION_PEER_ATTRIBUTES = {
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
const EMPTY_AUTHORIZATION_INFO = {
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

function toNumericValue(...values: unknown[]) {
  const candidate = values.find((value) => value !== undefined && value !== null && value !== '')
  return candidate === undefined ? 0 : Number(candidate)
}

export function createEmptyAuthorizationNode() {
  return createEmptyFromTemplate(EMPTY_AUTHORIZATION_NODE)
}

export function createEmptyAuthorizationPeer() {
  return createEmptyFromTemplate(EMPTY_AUTHORIZATION_PEER)
}

export function createEmptyAuthorizationPeerAttributes() {
  return createEmptyFromTemplate(EMPTY_AUTHORIZATION_PEER_ATTRIBUTES)
}

export function createEmptyAuthorizationInfo() {
  return createEmptyFromTemplate(EMPTY_AUTHORIZATION_INFO)
}

export function mapAuthorizationCurrentNode(node: Record<string, unknown> = {}) {
  if (!node || typeof node !== 'object') {
    return createEmptyAuthorizationNode()
  }

  const mappedNode = mapOffChainNodeRecord(node)
  const maxAuthorize = toNumericValue(mappedNode.maxAuthorize, mappedNode.max_authorize)
  const totalPos = toNumericValue(mappedNode.totalPos, mappedNode.total_pos)

  return {
    ...mappedNode,
    maxAuthorize,
    maxAuthorizeStr: mappedNode.maxAuthorizeStr || formatNumberForDisplay(maxAuthorize),
    totalPos,
    totalPosStr: mappedNode.totalPosStr || formatNumberForDisplay(totalPos),
  }
}
