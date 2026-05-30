import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpClient: {
    get: vi.fn(),
  },
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: mocks.httpClient,
}))

import { fetchExchangeRate } from './marketDomainService'

describe('market/marketDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchExchangeRate', () => {
    it('composes the rate URL from currency, goal type, and amount, returning the Money field', async () => {
      mocks.httpClient.get.mockResolvedValue({ Result: { Money: 12.5 } })

      const result = await fetchExchangeRate('CNY', 'ONT', 10)

      expect(result).toBe(12.5)
      expect(mocks.httpClient.get).toHaveBeenCalledWith(
        'https://service.onto.app/S3/api/v1/onto/exchangerate/reckon/CNY/ONT/10'
      )
    })

    it('returns null when the response envelope is missing Result', async () => {
      mocks.httpClient.get.mockResolvedValue({})

      const result = await fetchExchangeRate('CNY', 'ONT', 10)

      expect(result).toBeNull()
    })

    it('returns null on a network error', async () => {
      mocks.httpClient.get.mockRejectedValue(new Error('network down'))

      const result = await fetchExchangeRate('CNY', 'ONT', 10)

      expect(result).toBeNull()
    })
  })
})
