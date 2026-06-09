import httpClient from '../../shared/network/httpClient'
import { getExplorerApiBaseUrl } from '../../shared/lib/constants'
import { createLogger } from '../../shared/lib/logger'
import type { NativeBalance, WalletCollections } from '../../shared/lib/types'
import type { Result } from '../../shared/lib/result'
import { success, failure, tryResult } from '../../shared/lib/result'
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
  return tryResult(() => findWalletCollections(), {
    context: 'fetchWalletCollections',
    errorKey: 'common.savedbFailed',
    logger,
    mapError: mapStorageError,
  })
}

export async function fetchIdentityCollection(): Promise<Result<unknown[]>> {
  return tryResult(() => findIdentityCollection(), {
    context: 'fetchIdentityCollection',
    errorKey: 'common.savedbFailed',
    logger,
    mapError: mapStorageError,
  })
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

    const balance: NativeBalance = { ont: '0', ong: '0' }
    for (const item of res.result) {
      if (item.asset_name === 'ong') balance.ong = item.balance
      if (item.asset_name === 'waitboundong') balance.waitBoundOng = item.balance
      if (item.asset_name === 'unboundong') balance.unboundOng = item.balance
      if (item.asset_name === 'ont') balance.ont = item.balance
    }
    return success(balance)
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
  return tryResult(() => httpClient.post(url, { scriptHash }, { silent: true }), {
    context: 'registerOep4Contract',
    errorKey: 'common.networkErr',
    logger,
    mapError: mapNetworkError,
  })
}

export async function queryOep4TransactionHistory(
  network: string,
  address: string,
  pageSize = 10,
  pageNum = 1
): Promise<Result<unknown>> {
  const base = getExplorerApiBaseUrl(network)
  const url = `${base}/api/v1/explorer/address/${address}/${pageSize}/${pageNum}`
  return tryResult(
    async () => {
      const res = await httpClient.get<{ Result?: unknown }>(url)
      return res?.Result ?? null
    },
    {
      context: 'queryOep4TransactionHistory',
      errorKey: 'common.networkErr',
      logger,
      mapError: mapNetworkError,
    }
  )
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

  return tryResult(
    async () => {
      const response = await httpClient.get<{ result?: unknown[] }>(url)
      return response?.result || []
    },
    {
      context: 'fetchWalletTransactionGroups',
      errorKey: 'common.networkErr',
      logger,
      mapError: mapNetworkError,
    }
  )
}
