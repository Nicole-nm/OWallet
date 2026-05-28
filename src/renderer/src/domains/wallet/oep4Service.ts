import { BigNumber } from 'bignumber.js'
import httpClient from '../../shared/network/httpClient'
import { getTokenBalanceUrl, getTokenListUrl } from '../../shared/lib/urlBuilder'
import { getRestClient } from '../../shared/chain/restClient'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import { serializeTx } from '../transaction/serializationService'
import type { TrackedOep4Token } from '../../shared/types'
import type { SdkTransactionLike } from '../../shared/chain/types'

interface PreExecResult {
  Result?: {
    Result?: string
  }
}

interface TokenListResponse {
  result: {
    records: Array<Record<string, unknown>>
    total: number
  }
}

interface TokenBalanceEntry {
  asset_name?: string
  balance?: string | number
  [key: string]: unknown
}

function serializeOep4Tx(tx: unknown, context: string) {
  return serializeTx(tx as SdkTransactionLike, context)
}

export async function hasOep4Contract(scriptHash: string) {
  const restClient = getRestClient()
  const res = await restClient.getContract(scriptHash)
  return Boolean(res.Result)
}

export async function queryOep4StringProperty(scriptHash: string, method: 'name' | 'symbol') {
  const { Crypto, Oep4, utils } = await loadOntologySdk()
  const contractAddr = new Crypto.Address(utils.reverseHex(scriptHash))
  const oep4 = new Oep4.Oep4TxBuilder(contractAddr)
  const tx = method === 'name' ? oep4.queryName() : oep4.querySymbol()
  const restClient = getRestClient()
  const res = (await restClient.sendRawTransaction(
    serializeOep4Tx(tx, 'wallet.queryOep4StringProperty.serialize'),
    true
  )) as PreExecResult
  if (res.Result?.Result) {
    return utils.hexstr2str(res.Result.Result)
  }
  return 'OEP4'
}

export async function queryOep4Decimal(scriptHash: string) {
  const { Crypto, Oep4, utils } = await loadOntologySdk()
  const contractAddr = new Crypto.Address(utils.reverseHex(scriptHash))
  const oep4 = new Oep4.Oep4TxBuilder(contractAddr)
  const tx = oep4.queryDecimals()
  const restClient = getRestClient()
  const res = (await restClient.sendRawTransaction(
    serializeOep4Tx(tx, 'wallet.queryOep4Decimal.serialize'),
    true
  )) as PreExecResult
  if (res.Result?.Result) {
    return parseInt(res.Result.Result, 16)
  }
  return 0
}

export async function queryOep4Balance(scriptHash: string, address: string, decimal = 0) {
  const { Crypto, Oep4, utils } = await loadOntologySdk()
  const contractAddr = new Crypto.Address(utils.reverseHex(scriptHash))
  const oep4 = new Oep4.Oep4TxBuilder(contractAddr)
  const tx = oep4.queryBalanceOf(new Crypto.Address(address))
  const restClient = getRestClient()
  const res = (await restClient.sendRawTransaction(
    serializeOep4Tx(tx, 'wallet.queryOep4Balance.serialize'),
    true
  )) as PreExecResult
  if (res.Result?.Result) {
    const value = new BigNumber(utils.reverseHex(res.Result.Result), 16)
    return value.dividedBy(Math.pow(10, decimal)).toNumber()
  }
  return 0
}

export function queryAllOep4Balances(
  oep4s: Array<TrackedOep4Token & { scriptHash: string }>,
  address: string,
  currentNet: string
) {
  return Promise.all(
    oep4s.map((item) => {
      if (item.net !== currentNet) return Promise.resolve(0)
      return queryOep4Balance(item.scriptHash, address, item.decimal)
    })
  )
}

export async function fetchOep4TokenList(pageSize: number, pageNumber: number) {
  const url = getTokenListUrl('oep4', pageSize, pageNumber)
  const res = (await httpClient.get(url)) as TokenListResponse
  return { records: res.result.records, total: res.result.total }
}

export async function fetchOep4TokenBalances(address: string) {
  const url = getTokenBalanceUrl('oep4', address)
  const res = (await httpClient.get(url)) as { result: TokenBalanceEntry[] }
  return res.result
}
