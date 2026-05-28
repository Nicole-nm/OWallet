import {
  formatAuthorizationInfo,
  fetchNodeStakeList,
  fetchOffChainNodes,
  fetchPeerFromPool,
  fetchPeerAttributes as fetchPeerAttributesFromService,
  fetchAuthorizationInfo as fetchAuthorizationInfoFromService,
  fetchSplitFee as fetchSplitFeeFromService,
  fetchPosLimit as fetchPosLimitFromService,
  fetchPeerUnboundOng as fetchUnboundOngFromService,
  fetchRoundBlockCount,
  searchUserStakeHistory,
} from '../../../domains/governance/queryService'
import { createLogger } from '../../../shared/lib/logger'
import { formatNumberForDisplay } from '../../../shared/lib/numberFormat'
import { createTryCatch } from '../../../shared/lib/result'
import {
  createEmptyAuthorizationInfo,
  createEmptyAuthorizationPeer,
  createEmptyAuthorizationPeerAttributes,
  mapAuthorizationCurrentNode,
} from '../domain/authorizationMapper'
import { normalizeNodePublicKey } from '../domain/nodeMapper'
import type { GovernanceNode } from '../../../shared/types'
import type { AuthorizationInfo, NodeInfo } from '../../../shared/lib/types'

const logger = createLogger('authorizationQueryApplicationService')
const NETWORK_ERROR_KEY = 'commonWalletHome.networkError'
const DEFAULT_POS_LIMIT = 10
const tryNetworkQuery = createTryCatch({ errorKey: NETWORK_ERROR_KEY, logger })

export {
  createEmptyAuthorizationInfo,
  createEmptyAuthorizationPeer,
  createEmptyAuthorizationPeerAttributes,
} from '../domain/authorizationMapper'

function createEmptySplitFee() {
  return { address: '', amount: 0 }
}

type GovernanceRecord = Record<string, unknown>

interface AuthorizationAddressPublicKeyParams {
  address: string
  pk: string
}

interface AuthorizationNodeListParams {
  network: string
  pageSize?: number
  pageNum?: number
}

interface AuthorizationNetworkParams {
  network: string
}

interface AuthorizationStakeHistoryParams extends AuthorizationNetworkParams {
  address: string
}

function hasBase58Address(address: unknown): address is { toBase58: () => string } {
  return Boolean(address && typeof (address as { toBase58?: unknown }).toBase58 === 'function')
}

function formatNumericValue(value: unknown) {
  return formatNumberForDisplay(typeof value === 'number' || typeof value === 'string' ? value : 0)
}

function normalizeRecordList(value: unknown): GovernanceRecord[] {
  return Array.isArray(value) ? (value as GovernanceRecord[]) : []
}

function toBase58Address(address: unknown) {
  if (!address) {
    return ''
  }

  return typeof address === 'string' ? address : hasBase58Address(address) ? address.toBase58() : ''
}

export function mapAuthorizationPeer(peer: object | null | undefined) {
  if (!peer) {
    return createEmptyAuthorizationPeer()
  }

  const peerRecord = peer as GovernanceRecord

  return {
    peerPubkey: normalizeNodePublicKey(peer),
    address: toBase58Address(peerRecord.address),
    status: peerRecord.status,
    initPos: peerRecord.initPos,
    initPosStr: formatNumericValue(peerRecord.initPos),
    totalPos: peerRecord.totalPos,
    totalPosStr: formatNumericValue(peerRecord.totalPos),
  }
}

export function mapAuthorizationPeerAttributes(peerAttributes: object | null | undefined) {
  if (!peerAttributes) {
    return createEmptyAuthorizationPeerAttributes()
  }

  const peerAttributesRecord = peerAttributes as GovernanceRecord

  return {
    peerPubkey: normalizeNodePublicKey(peerAttributes),
    maxAuthorize: peerAttributesRecord.maxAuthorize,
    maxAuthorizeStr: formatNumericValue(peerAttributesRecord.maxAuthorize),
    t2PeerCost: peerAttributesRecord.t2PeerCost,
    t1PeerCost: peerAttributesRecord.t1PeerCost,
    tPeerCost: peerAttributesRecord.tPeerCost,
    t2StakeCost: peerAttributesRecord.t2StakeCost,
    t1StakeCost: peerAttributesRecord.t1StakeCost,
    tStakeCost: peerAttributesRecord.tStakeCost,
  }
}

export function mapAuthorizationInfoRecord(info: AuthorizationInfo | null | undefined) {
  if (!info) {
    return createEmptyAuthorizationInfo()
  }

  return {
    ...info,
    ...formatAuthorizationInfo(info),
  }
}

export function mapAuthorizationNodeListPage(
  items: GovernanceRecord[] = [],
  pageSize = 10,
  pageNum = 0
) {
  const total = items.length
  const list = items.slice(pageNum * pageSize, (pageNum + 1) * pageSize).map((item) => {
    const mappedNode = mapAuthorizationCurrentNode(item) as GovernanceNode
    const pageNode: Record<string, unknown> = { ...mappedNode }
    delete pageNode.node_rank
    delete pageNode.node_proportion
    delete pageNode.user_proportion
    delete pageNode.current_stake
    delete pageNode.total_pos
    delete pageNode.init_pos
    delete pageNode.max_authorize
    delete pageNode.detail_url
    delete pageNode.progress
    const currentStakeValue = Number(item.currentStakeValue ?? item.current_stake ?? 0)

    return {
      ...pageNode,
      rank: item.rank ?? item.node_rank ?? 0,
      nodeProportion: item.nodeProportion ?? item.node_proportion ?? '',
      userProportion: item.userProportion ?? item.user_proportion ?? '',
      currentStakeValue,
      currentStake: formatNumberForDisplay(currentStakeValue),
      process: item.process ?? item.progress ?? '',
      initPos: item.initPos ?? item.init_pos ?? 0,
      detailUrl: item.detailUrl ?? item.detail_url ?? '',
      address: item.address || mappedNode.nodeAddress,
      nodeAddress: item.address || mappedNode.nodeAddress,
    }
  })

  return { total, list: list as unknown as GovernanceNode[] }
}

export async function refreshAuthorizationOverview({
  address,
  pk,
}: AuthorizationAddressPublicKeyParams) {
  return tryNetworkQuery(
    async () => {
      const [authorizationInfo, splitFee, peerAttributes, peerUnboundOng] = await Promise.all([
        fetchAuthorizationInfoFromService(pk, address),
        fetchSplitFeeFromService(address),
        fetchPeerAttributesFromService(pk),
        fetchUnboundOngFromService(address),
      ])

      return {
        authorizationInfo: mapAuthorizationInfoRecord(authorizationInfo),
        splitFee: splitFee || createEmptySplitFee(),
        peerAttributes: mapAuthorizationPeerAttributes(peerAttributes),
        peerUnboundOng: peerUnboundOng ?? 0,
      }
    },
    {
      context: 'refreshAuthorizationOverview',
      onFailure: () => ({
        authorizationInfo: createEmptyAuthorizationInfo(),
        splitFee: createEmptySplitFee(),
        peerAttributes: createEmptyAuthorizationPeerAttributes(),
        peerUnboundOng: 0,
      }),
    }
  )
}

export async function refreshAuthorizationStakeInfo({
  address,
  pk,
}: AuthorizationAddressPublicKeyParams) {
  return tryNetworkQuery(
    async () => {
      const [peer, posLimit, authorizationInfo] = await Promise.all([
        fetchPeerFromPool(pk),
        fetchPosLimitFromService(),
        fetchAuthorizationInfoFromService(pk, address),
      ])

      return {
        currentPeer: mapAuthorizationPeer(peer),
        posLimit: posLimit ?? DEFAULT_POS_LIMIT,
        authorizationInfo: mapAuthorizationInfoRecord(authorizationInfo),
      }
    },
    {
      context: 'refreshAuthorizationStakeInfo',
      onFailure: () => ({
        currentPeer: createEmptyAuthorizationPeer(),
        posLimit: DEFAULT_POS_LIMIT,
        authorizationInfo: createEmptyAuthorizationInfo(),
      }),
    }
  )
}

export async function refreshAuthorizationNodeSettings({
  address,
  pk,
}: AuthorizationAddressPublicKeyParams) {
  return tryNetworkQuery(
    async () => {
      const [peer, peerAttributes, splitFee, posLimit, peerUnboundOng] = await Promise.all([
        fetchPeerFromPool(pk),
        fetchPeerAttributesFromService(pk),
        fetchSplitFeeFromService(address),
        fetchPosLimitFromService(),
        fetchUnboundOngFromService(address),
      ])

      return {
        currentPeer: mapAuthorizationPeer(peer),
        peerAttributes: mapAuthorizationPeerAttributes(peerAttributes),
        splitFee: splitFee || createEmptySplitFee(),
        posLimit: posLimit ?? DEFAULT_POS_LIMIT,
        peerUnboundOng: peerUnboundOng ?? 0,
      }
    },
    {
      context: 'refreshAuthorizationNodeSettings',
      onFailure: () => ({
        currentPeer: createEmptyAuthorizationPeer(),
        peerAttributes: createEmptyAuthorizationPeerAttributes(),
        splitFee: createEmptySplitFee(),
        posLimit: DEFAULT_POS_LIMIT,
        peerUnboundOng: 0,
      }),
    }
  )
}

export async function loadAuthorizationNodeListPage({
  network,
  pageSize,
  pageNum,
}: AuthorizationNodeListParams) {
  return tryNetworkQuery(
    async () => {
      const records = normalizeRecordList(await fetchNodeStakeList(network))
      const page = mapAuthorizationNodeListPage(records, pageSize, pageNum)
      return { total: page.total, nodes: page.list }
    },
    {
      context: 'loadAuthorizationNodeListPage',
      onFailure: () => ({ total: 0, nodes: [] as GovernanceNode[] }),
    }
  )
}

export async function loadAuthorizationBlockCountdown({ network }: AuthorizationNetworkParams) {
  return tryNetworkQuery(async () => ({ countdown: await fetchRoundBlockCount(network) }), {
    context: 'loadAuthorizationBlockCountdown',
  })
}

export async function loadAuthorizationStakeHistory({
  network,
  address,
}: AuthorizationStakeHistoryParams) {
  return tryNetworkQuery(
    async () => {
      const nodes = normalizeRecordList(await fetchOffChainNodes(network)).filter(
        (node) => normalizeNodePublicKey(node).indexOf('00aaaaaaaaa') < 0
      )
      return { stakeHistory: await searchUserStakeHistory(address, nodes as unknown as NodeInfo[]) }
    },
    {
      context: 'loadAuthorizationStakeHistory',
      onFailure: () => ({ stakeHistory: [] as unknown[] }),
    }
  )
}
