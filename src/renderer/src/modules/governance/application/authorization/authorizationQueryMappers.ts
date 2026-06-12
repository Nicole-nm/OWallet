import { formatAuthorizationInfo } from '../../../../domains/governance/queryService'
import { formatNumberForDisplay } from '../../../../shared/lib/numberFormat'
import {
  createEmptyAuthorizationInfo,
  createEmptyAuthorizationPeer,
  createEmptyAuthorizationPeerAttributes,
  mapAuthorizationCurrentNode,
} from '../../domain/authorizationMapper'
import { normalizeNodePublicKey } from '../../domain/nodeMapper'
import type { GovernanceNode } from '../../../../shared/types'
import type { AuthorizationInfo } from '../../../../shared/lib/types'

export type GovernanceRecord = Record<string, unknown>
export type AuthorizationNodeListSortField = 'currentStake' | 'annualizedYield'
export type AuthorizationNodeListSortOrder = 'ascend' | 'descend'

export interface AuthorizationNodeListSort {
  field: AuthorizationNodeListSortField
  order: AuthorizationNodeListSortOrder
}

function hasBase58Address(address: unknown): address is { toBase58: () => string } {
  return Boolean(address && typeof (address as { toBase58?: unknown }).toBase58 === 'function')
}

function formatNumericValue(value: unknown) {
  return formatNumberForDisplay(typeof value === 'number' || typeof value === 'string' ? value : 0)
}

function formatAnnualizedYield(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value.toFixed(2)}%` : ''
  }

  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'not open') {
    return ''
  }

  if (text.endsWith('%')) {
    return text
  }

  const numericValue = Number(text)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)}%` : text
}

function parseSortableNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (value === undefined || value === null) {
    return null
  }

  const normalizedValue = String(value)
    .trim()
    .replace(/[%\s,\u2009\u202f\u00a0]/g, '')
  if (!normalizedValue || normalizedValue.toLowerCase() === 'notopen') {
    return null
  }

  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) ? numericValue : null
}

function getNodeSortValue(item: GovernanceRecord, field: AuthorizationNodeListSortField) {
  if (field === 'currentStake') {
    return parseSortableNumber(item.currentStakeValue ?? item.current_stake ?? 0)
  }

  return parseSortableNumber(item.annualizedYield ?? item.apr ?? item.annual ?? '')
}

function compareNodeSortValues(
  a: GovernanceRecord,
  b: GovernanceRecord,
  sort: AuthorizationNodeListSort
) {
  const valueA = getNodeSortValue(a, sort.field)
  const valueB = getNodeSortValue(b, sort.field)

  if (valueA === null && valueB === null) {
    return 0
  }

  if (valueA === null) {
    return 1
  }

  if (valueB === null) {
    return -1
  }

  const comparison = valueA - valueB
  return sort.order === 'ascend' ? comparison : -comparison
}

function sortAuthorizationNodeListRecords(
  items: GovernanceRecord[],
  sort?: AuthorizationNodeListSort | null
) {
  if (!sort) {
    return items
  }

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compareNodeSortValues(a.item, b.item, sort) || a.index - b.index)
    .map(({ item }) => item)
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
  pageNum = 0,
  sort?: AuthorizationNodeListSort | null
) {
  const sortedItems = sortAuthorizationNodeListRecords(items, sort)
  const total = sortedItems.length
  const list = sortedItems.slice(pageNum * pageSize, (pageNum + 1) * pageSize).map((item) => {
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
      annualizedYield: formatAnnualizedYield(item.annualizedYield ?? item.apr ?? item.annual ?? ''),
      initPos: item.initPos ?? item.init_pos ?? 0,
      detailUrl: item.detailUrl ?? item.detail_url ?? '',
      address: item.address || mappedNode.nodeAddress,
      nodeAddress: item.address || mappedNode.nodeAddress,
    }
  })

  return { total, list: list as unknown as GovernanceNode[] }
}
