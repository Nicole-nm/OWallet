import httpClient from '../../shared/network/httpClient'
import { createLogger } from '../../shared/lib/logger'

const EXCHANGE_RATE_BASE = 'https://service.onto.app/S3/api/v1/onto/exchangerate/reckon'
const logger = createLogger('marketApplicationService')

interface ExchangeRateResponse {
  Result?: {
    Money?: number
  }
}

export async function fetchExchangeRate(
  currency: string,
  goalType: string,
  amount: number | string
): Promise<number | null> {
  try {
    const url = `${EXCHANGE_RATE_BASE}/${currency}/${goalType}/${amount}`
    const res = (await httpClient.get(url)) as ExchangeRateResponse
    if (res && res.Result) {
      return res.Result.Money ?? null
    }
    return null
  } catch (err: unknown) {
    logger.error('fetchExchangeRate', err)
    return null
  }
}
