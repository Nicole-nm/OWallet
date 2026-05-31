import httpClient from '../../shared/network/httpClient'
import { getExplorerApiBaseUrl } from '../../shared/lib/constants'
import { createLogger } from '../../shared/lib/logger'
import type { NativeBalance, WalletCollections } from '../../shared/lib/types'
import type { Result } from '../../shared/lib/result'
import { success, failure } from '../../shared/lib/result'
import { mapNetworkError, mapStorageError } from '../../shared/lib/errors'
import { getBalanceUrl } from '../../shared/lib/urlBuilder'
import { findIdentityCollection, findWalletCollections } from './repository'

export {
  containsLocalCopayer as hasLocalCopayer,
  findCommonWalletDocs as fetchCommonWalletDocs,
  findLocalAccountByAddress as findLocalAccount,
  findLocalAccounts as fetchLocalAccounts,
  findLocalCopayers as getLocalCopayers,
  findRecordByAddress as findByAddress,
  findRecordsByPublicKeys as findByPublicKeys,
  insertIdentityRecord as insertIdentity,
  insertWalletRecord as insertWallet,
  removeIdentityRecord as removeIdentity,
  removeWalletRecord as removeWallet,
  updateWalletRecord as updateWalletField,
} from './repository'

const logger = createLogger('walletDomainService')

export async function fetchWalletCollections(): Promise<Result<WalletCollections>> {
  try {
    const data = await findWalletCollections()
    return success(data)
  } catch (err: unknown) {
    logger.error('fetchWalletCollections', err)
    return failure('common.savedbFailed', undefined, mapStorageError(err))
  }
}

export async function fetchIdentityCollection(): Promise<Result<unknown[]>> {
  try {
    const data = await findIdentityCollection()
    return success(data)
  } catch (err: unknown) {
    logger.error('fetchIdentityCollection', err)
    return failure('common.savedbFailed', undefined, mapStorageError(err))
  }
}

interface NativeBalanceItem {
  asset_name: string
  balance: string
}

export async function fetchNativeBalance(address: string): Promise<Result<NativeBalance>> {
  if (!address) return failure('common.networkErr')
  const url = getBalanceUrl(address, 'NATIVE')
  try {
    const res = await httpClient.get<{ result?: NativeBalanceItem[] }>(url)
    if (!res.result) return failure('common.networkErr')

    const balance: Partial<NativeBalance> = {}
    for (const item of res.result) {
      if (item.asset_name === 'ong') balance.ong = item.balance
      if (item.asset_name === 'waitboundong') balance.waitBoundOng = item.balance
      if (item.asset_name === 'unboundong') balance.unboundOng = item.balance
      if (item.asset_name === 'ont') balance.ont = item.balance
    }
    return success(balance as NativeBalance)
  } catch (err: unknown) {
    logger.error('fetchNativeBalance', err)
    return failure('common.networkErr', undefined, mapNetworkError(err))
  }
}

export async function registerOep4Contract(
  network: string,
  scriptHash: string
): Promise<Result<unknown>> {
  const base = getExplorerApiBaseUrl(network)
  const url = base + '/api/v1/explorer/oep4/info'
  try {
    const result = await httpClient.post(url, { scriptHash }, { silent: true })
    return success(result)
  } catch (err: unknown) {
    logger.error('registerOep4Contract', err)
    return failure('common.networkErr', undefined, mapNetworkError(err))
  }
}

export async function queryOep4TransactionHistory(
  network: string,
  address: string,
  pageSize = 10,
  pageNum = 1
): Promise<Result<unknown>> {
  const base = getExplorerApiBaseUrl(network)
  const url = `${base}/api/v1/explorer/address/${address}/${pageSize}/${pageNum}`
  try {
    const res = await httpClient.get<{ Result?: unknown }>(url)
    if (res && res.Result) {
      return success(res.Result)
    }
    return success(null)
  } catch (err: unknown) {
    return failure('common.networkErr', undefined, mapNetworkError(err))
  }
}

export async function fetchWalletTransactionGroups({
  address,
  network,
  pageSize = 10,
  pageNumber = 1,
}: {
  address: string
  network: string
  pageSize?: number
  pageNumber?: number
}): Promise<Result<unknown[]>> {
  if (!address) return failure('common.networkErr')

  const url =
    `${getExplorerApiBaseUrl(network)}/v2/addresses/${address}/transactions` +
    `?page_size=${pageSize}&page_number=${pageNumber}`

  try {
    const response = await httpClient.get<{ result?: unknown[] }>(url)
    return success(response?.result || [])
  } catch (err: unknown) {
    return failure('common.networkErr', undefined, mapNetworkError(err))
  }
}
