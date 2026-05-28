import httpClient from '../../shared/network/httpClient'
import { createLogger } from '../../shared/lib/logger'
import { type Result, success, failure } from '../../shared/lib/result'

const logger = createLogger('dappsService')

interface CoinListResponse {
  Data?: unknown
}

export async function fetchPriceList(): Promise<Result<unknown>> {
  try {
    const data = await httpClient.get('https://coincap.io/front')
    return success(data)
  } catch (err: unknown) {
    logger.error('fetchPriceList', err)
    return failure('common.networkErr')
  }
}

export async function fetchCoinList(): Promise<Result<unknown>> {
  try {
    const res = (await httpClient.get(
      'https://min-api.cryptocompare.com/data/all/coinlist'
    )) as CoinListResponse
    if (res && res.Data) {
      return success(res.Data)
    }
    return failure('common.networkErr')
  } catch (err: unknown) {
    logger.error('fetchCoinList', err)
    return failure('common.networkErr')
  }
}
