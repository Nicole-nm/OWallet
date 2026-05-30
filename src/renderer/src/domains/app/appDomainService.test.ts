import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpClient: {
    get: vi.fn(),
  },
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: mocks.httpClient,
}))

import { fetchLatestRelease } from './appDomainService'

describe('app/appDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchLatestRelease', () => {
    it('returns the GitHub release payload when the fetch succeeds', async () => {
      const payload = { tag_name: 'v1.0.0' }
      mocks.httpClient.get.mockResolvedValue(payload)

      const result = await fetchLatestRelease()

      expect(result).toBe(payload)
      expect(mocks.httpClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/ontio/OWallet/releases/latest'
      )
    })

    it('returns null when the fetch throws', async () => {
      mocks.httpClient.get.mockRejectedValue(new Error('network down'))

      const result = await fetchLatestRelease()

      expect(result).toBeNull()
    })
  })
})
