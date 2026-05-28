import httpClient from '../../shared/network/httpClient'
import { fetchJson } from '../../shared/platform/bridge'
import { getExplorerApiUrl, getOntPassHost, ONT_PASS_API_PATHS } from '../../shared/lib/constants'
import { str2hexstr } from '../../shared/chain/sdkHex'
import { getTransactionHash, serializeTransaction } from '../transaction/applicationService'
import { createRegisterCandidateTransaction } from '../governance/applicationService'
import type { SdkTransactionLike } from '../../shared/chain/types'

type HttpBody = Record<string, unknown>

function getBaseUrl(network: string) {
  return getOntPassHost(network)
}

function buildUrl(baseUrl: string, params: HttpBody = {}) {
  const requestUrl = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      requestUrl.searchParams.set(key, String(value))
    }
  })
  return requestUrl.toString()
}

export function submitDelegatedStakeTransaction(network: string, body: HttpBody) {
  return httpClient.post(getBaseUrl(network) + ONT_PASS_API_PATHS.DelegateSendTx, body, {
    silent: true,
  })
}

export function saveStakeInfo(network: string, params: HttpBody) {
  return httpClient.post(getBaseUrl(network) + ONT_PASS_API_PATHS.SetStakeInfo, params, {
    silent: true,
  })
}

export function fetchStakeInfo(network: string, ontid: string) {
  return httpClient.get(getBaseUrl(network) + ONT_PASS_API_PATHS.GetStakeInfo, {
    params: { ontid },
  })
}

export function fetchQualifiedState(network: string, ontid: string, address: string) {
  return httpClient.get(getBaseUrl(network) + ONT_PASS_API_PATHS.GetQualifiedState, {
    params: { ontid, address },
  })
}

export function fetchVoteContractAddress(network: string, netType: string) {
  return httpClient.get(getBaseUrl(network) + ONT_PASS_API_PATHS.GetVoteContract + '/' + netType)
}

export function fetchStakeDetail(network: string, payload: HttpBody | string = {}) {
  const params =
    typeof payload === 'string'
      ? { ontid: payload }
      : {
          ontid: payload.ontid,
          address: payload.address,
          publickey: payload.publicKey || payload.public_key || payload.publickey,
        }

  return fetchJson(buildUrl(getBaseUrl(network) + ONT_PASS_API_PATHS.GetStakeInfo, params))
}

export async function fetchNodeInfo(network: string, publicKey: string) {
  const res = (await fetchJson(
    buildUrl(getExplorerApiUrl('/v2/nodes/off-chain-info/public', network), {
      public_key: publicKey,
    })
  )) as { result?: unknown }
  return res.result || {}
}

export function updateNodeInfo(network: string, info: HttpBody) {
  return fetchJson(getExplorerApiUrl('/v2/offchain/off-chain-info', network), {
    method: 'POST',
    body: info,
  })
}

export function updateLedgerNodeInfo(network: string, info: HttpBody) {
  return fetchJson(getExplorerApiUrl('/v2/offchain/off-chain-info/ledger', network), {
    method: 'POST',
    body: info,
  })
}

export function createStakeInfo(network: string, info: HttpBody) {
  return fetchJson(getExplorerApiUrl('/v2/offchain/off-chain-info/new', network), {
    method: 'POST',
    body: info,
  })
}

export async function createNodeStakeRegistrationTransaction({
  ontid,
  publicKey,
  initPos,
  stakeWalletAddress,
}: {
  ontid: string
  publicKey: string
  initPos: number
  stakeWalletAddress: string
}) {
  return createRegisterCandidateTransaction({ ontid, publicKey, initPos, stakeWalletAddress })
}

export function createDelegatedStakeTransactionBody({
  tx,
  ontid,
  publicKey,
  stakeWalletAddress,
}: {
  tx: SdkTransactionLike
  ontid: string
  publicKey: string
  stakeWalletAddress: string
}) {
  return {
    ontid,
    publickey: publicKey,
    stakewalletaddress: stakeWalletAddress,
    transactionhash: getTransactionHash(tx),
    transactionbodyhash: serializeTransaction(tx),
  }
}

export function serializeNodeStakeInfo(payload: HttpBody = {}) {
  return str2hexstr(JSON.stringify(payload))
}
