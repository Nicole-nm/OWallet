import {
  REST_PORT,
  getExplorerApiBaseUrl,
  getExplorerPageBaseUrl,
  isTestNetNetwork,
} from './constants'
import {
  getDefaultNodeAddressForNetwork,
  loadNetworkSetting,
  loadNodeAddressSetting,
} from '../persistence/appStateService'

export function getNodeUrl() {
  const net = loadNetworkSetting()
  let node = loadNodeAddressSetting()
  if (!node) {
    node = getDefaultNodeAddressForNetwork(net)
  }
  return node + ':' + REST_PORT
}

export function getExplorerUrl() {
  const net = loadNetworkSetting()
  return getExplorerApiBaseUrl(net)
}

export function getTransactionListUrl(address: string, pageSize = 10, pageNumber = 1) {
  return (
    getExplorerUrl() +
    `/v2/addresses/${address}/transactions?page_size=${pageSize}&page_number=${pageNumber}`
  )
}

export function getBalanceUrl(address: string, tokenType = 'NATIVE') {
  return getExplorerUrl() + `/v2/addresses/${address}/${tokenType}/balances`
}

export function getTokenListUrl(tokenType = 'oep4', pageSize = 10, pageNumber = 1) {
  return (
    getExplorerUrl() + `/v2/tokens/${tokenType}?page_size=${pageSize}&page_number=${pageNumber}`
  )
}

export function getTokenBalanceUrl(tokenType: string, address: string) {
  return getExplorerUrl() + `/v2/addresses/${address}/${tokenType}/balances`
}

function testnetSuffix(network?: string) {
  return isTestNetNetwork(network) ? '/testnet' : ''
}

export function getExplorerTxPageUrl(txHash: string, network?: string) {
  return `${getExplorerPageBaseUrl(network)}/transaction/${txHash}${testnetSuffix(network)}`
}

export function getExplorerAddressPageUrl(
  address: string,
  network?: string,
  pageSize = 10,
  page = 1
) {
  return `${getExplorerPageBaseUrl(network)}/address/${address}/${pageSize}/${page}${testnetSuffix(network)}`
}
