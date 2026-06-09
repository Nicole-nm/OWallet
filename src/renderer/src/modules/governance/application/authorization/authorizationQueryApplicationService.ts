import {
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
} from '../../../../domains/governance/queryService'
import { createLogger } from '../../../../shared/lib/logger'
import { createTryCatch } from '../../../../shared/lib/result'
import {
  createEmptyAuthorizationInfo,
  createEmptyAuthorizationPeer,
  createEmptyAuthorizationPeerAttributes,
} from '../../domain/authorizationMapper'
import { normalizeNodePublicKey } from '../../domain/nodeMapper'
import {
  mapAuthorizationInfoRecord,
  mapAuthorizationNodeListPage,
  mapAuthorizationPeer,
  mapAuthorizationPeerAttributes,
  type GovernanceRecord,
} from './authorizationQueryMappers'
import type { GovernanceNode } from '../../../../shared/types'
import type { NodeInfo } from '../../../../shared/lib/types'

const logger = createLogger('authorizationQueryApplicationService')
const NETWORK_ERROR_KEY = 'commonWalletHome.networkError'
const DEFAULT_POS_LIMIT = 10
const tryNetworkQuery = createTryCatch({ errorKey: NETWORK_ERROR_KEY, logger })

export {
  createEmptyAuthorizationInfo,
  createEmptyAuthorizationPeer,
  createEmptyAuthorizationPeerAttributes,
}
export {
  mapAuthorizationInfoRecord,
  mapAuthorizationNodeListPage,
  mapAuthorizationPeer,
  mapAuthorizationPeerAttributes,
} from './authorizationQueryMappers'

function createEmptySplitFee() {
  return { address: '', amount: 0 }
}

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

function normalizeRecordList(value: unknown): GovernanceRecord[] {
  return Array.isArray(value) ? (value as GovernanceRecord[]) : []
}

export async function refreshAuthorizationOverview({
  address,
  pk,
}: AuthorizationAddressPublicKeyParams) {
  return tryNetworkQuery(
    async () => {
      const [authorizationInfo, splitFee, peerAttributes, peerUnboundOng, peer] = await Promise.all(
        [
          fetchAuthorizationInfoFromService(pk, address),
          fetchSplitFeeFromService(address),
          fetchPeerAttributesFromService(pk),
          fetchUnboundOngFromService(address),
          fetchPeerFromPool(pk),
        ]
      )

      return {
        authorizationInfo: mapAuthorizationInfoRecord(authorizationInfo),
        splitFee: splitFee || createEmptySplitFee(),
        peerAttributes: mapAuthorizationPeerAttributes(peerAttributes),
        peerUnboundOng: peerUnboundOng ?? 0,
        currentPeer: mapAuthorizationPeer(peer),
      }
    },
    {
      context: 'refreshAuthorizationOverview',
      onFailure: () => ({
        authorizationInfo: createEmptyAuthorizationInfo(),
        splitFee: createEmptySplitFee(),
        peerAttributes: createEmptyAuthorizationPeerAttributes(),
        peerUnboundOng: 0,
        currentPeer: createEmptyAuthorizationPeer(),
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
