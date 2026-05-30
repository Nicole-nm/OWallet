import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpClient: {
    get: vi.fn(),
  },
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: mocks.httpClient,
}))

import { fetchPriceList, fetchCoinList } from './dappsService'

describe('market/dappsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchPriceList', () => {
    it('wraps a successful response in a Result.ok payload', async () => {
      const payload = { coins: [] }
      mocks.httpClient.get.mockResolvedValue(payload)

      const result = await fetchPriceList()

      expect(result).toEqual({ ok: true, data: payload })
    })

    it('returns common.networkErr when the http call throws', async () => {
      mocks.httpClient.get.mockRejectedValue(new Error('boom'))

      const result = await fetchPriceList()

      expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
    })
  })

  describe('fetchCoinList', () => {
    it('unwraps the Data field into the Result payload on success', async () => {
      mocks.httpClient.get.mockResolvedValue({ Data: { BTC: {} } })

      const result = await fetchCoinList()

      expect(result).toEqual({ ok: true, data: { BTC: {} } })
    })

    it('returns common.networkErr when the response has no Data envelope', async () => {
      mocks.httpClient.get.mockResolvedValue({})

      const result = await fetchCoinList()

      expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
    })

    it('returns common.networkErr when the http call throws', async () => {
      mocks.httpClient.get.mockRejectedValue(new Error('boom'))

      const result = await fetchCoinList()

      expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
    })
  })
})
