import httpClient from '../../shared/network/httpClient'
import { BigNumber } from 'bignumber.js'
import { getExplorerApiBaseUrl, getExplorerApiUrl } from '../../shared/lib/constants'
import { settledWithConcurrency } from '../../shared/lib/concurrency'
import type { AuthorizationInfo, NodeInfo } from '../../shared/lib/types'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import {
  getPeerPoolMap,
  getAttributes,
  getAuthorizeInfo,
  getSplitFeeAddress,
  getGlobalParam,
  getPeerUnboundOng,
} from './transactionBuilder'
import type { StakeHistoryEntry } from './types'

const formatNumberForDisplay = (v: number | string) => Number(v).toLocaleString('en-US')

export function formatAuthorizationInfo(info: AuthorizationInfo) {
  let inAuthorization: string | number = info.consensusPos + info.freezePos + info.newPos
  inAuthorization = formatNumberForDisplay(inAuthorization)
  const newStakePortion = formatNumberForDisplay(info.newPos)
  const receiveProfitPortion = formatNumberForDisplay(info.consensusPos + info.freezePos)
  let locked: string | number = info.withdrawPos + info.withdrawFreezePos
  locked = formatNumberForDisplay(locked)
  const claimableVal = info.withdrawUnfreezePos
  const claimable = formatNumberForDisplay(claimableVal)
  return { inAuthorization, locked, claimable, claimableVal, newStakePortion, receiveProfitPortion }
}

export async function fetchPeerFromPool(pk: string | undefined) {
  const peerMap = await getPeerPoolMap()
  if (!pk) return peerMap
  return peerMap[pk] || null
}

export async function fetchPeerPoolMap() {
  return getPeerPoolMap()
}

export async function fetchPeerAttributes(pk: string) {
  return getAttributes(pk)
}

export async function fetchAuthorizationInfo(pk: string, address: string) {
  const { Crypto } = await loadOntologySdk()
  const userAddr = new Crypto.Address(address)
  return getAuthorizeInfo(pk, userAddr)
}

export async function fetchSplitFee(address: string) {
  const { Crypto } = await loadOntologySdk()
  const userAddr = new Crypto.Address(address)
  const splitFee = await getSplitFeeAddress(userAddr)
  if (splitFee && splitFee.amount) {
    splitFee.amount = new BigNumber(splitFee.amount).div(1e9).toFixed(9)
  }
  return splitFee
}

export async function fetchPosLimit() {
  const globalParams = await getGlobalParam()
  return globalParams?.posLimit ?? 10
}

export async function fetchPeerUnboundOng(address: string) {
  const { Crypto } = await loadOntologySdk()
  const addr = new Crypto.Address(address)
  const raw = await getPeerUnboundOng(addr)
  return new BigNumber(raw).div(1e9).toNumber()
}

export async function searchUserStakeHistory(
  address: string,
  nodes: NodeInfo[]
): Promise<StakeHistoryEntry[]> {
  const { Crypto } = await loadOntologySdk()
  const userAddr = new Crypto.Address(address)

  type StakeHistoryInfo = Awaited<ReturnType<typeof getAuthorizeInfo>> & {
    nodeAddress: string
    peerPubkey: string
    nodeName: string
  }

  const results = await settledWithConcurrency(nodes, async (item) => {
    const authorizeInfo = await getAuthorizeInfo(item.public_key, userAddr)
    return {
      ...authorizeInfo,
      nodeAddress: item.address,
      peerPubkey: item.public_key,
      nodeName: item.name,
    }
  })

  const infoTemp = results
    .filter((r): r is PromiseFulfilledResult<StakeHistoryInfo> => r.status === 'fulfilled')
    .map((r) => r.value)

  const list: StakeHistoryEntry[] = []

  infoTemp.forEach((item) => {
    if (item.nodeAddress === address) return
    const inAuth = item.consensusPos + item.freezePos + item.newPos
    const locked = item.withdrawPos + item.withdrawFreezePos
    const claimableVal = item.withdrawUnfreezePos
    if (inAuth > 0 || locked > 0 || claimableVal > 0) {
      // We pass `item` to `formatAuthorizationInfo` because `item` contains the properties of `AuthorizationInfo`.
      // The extra properties won't harm the result.
      const record = formatAuthorizationInfo(item as unknown as AuthorizationInfo)
      list.push({
        ...record,
        name: item.nodeName || 'Node_' + item.peerPubkey.substring(0, 6),
        nodePublicKey: item.peerPubkey,
        pk: item.peerPubkey,
        stakeWallet: address,
      })
    }
  })
  return list
}

export async function fetchNodeStakeList(network: string) {
  const url = getExplorerApiUrl('/v2/nodes/current-stakes', network)
  const res = await httpClient.get<{ code?: number; result?: unknown }>(url)
  if (res.code === 0 && res.result) {
    return res.result
  }
  throw new Error('Network error when fetching node list.')
}

export async function fetchRoundBlockCount(network: string) {
  const base = getExplorerApiBaseUrl(network)
  const url = base + '/v2/nodes/block-count-to-next-round'
  const res = await httpClient.get<{ result?: { count_to_next_round?: number | string } }>(url)
  if (res && res.result) {
    const { count_to_next_round } = res.result
    return Number(count_to_next_round)
  }
  throw new Error('Failed to fetch round block count')
}

export async function fetchOffChainNodes(network: string) {
  const url = getExplorerApiUrl('/v2/nodes/off-chain-infos', network)
  const res = await httpClient.get<{ result?: unknown }>(url)
  if (res && res.result) {
    return res.result
  }
  throw new Error('Failed to fetch off-chain nodes')
}
