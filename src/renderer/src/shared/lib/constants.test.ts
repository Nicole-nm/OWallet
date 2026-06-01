import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NETWORK,
  EXPLORER_URL,
  MAIN_NET_LIST,
  NETWORKS,
  TEST_NET_LIST,
  getDefaultNodeForNetwork,
  getExplorerApiBaseUrl,
  getExplorerApiUrl,
  getExplorerPageBaseUrl,
  getNodeListForNetwork,
  getOntPassHost,
  isTestNetNetwork,
} from './constants'

describe('shared/lib/constants', () => {
  describe('getNodeListForNetwork', () => {
    it('returns the mainnet list for MAIN_NET', () => {
      expect(getNodeListForNetwork(NETWORKS.MAIN_NET)).toBe(MAIN_NET_LIST)
    })

    it('returns the testnet list for TEST_NET', () => {
      expect(getNodeListForNetwork(NETWORKS.TEST_NET)).toBe(TEST_NET_LIST)
    })

    it('falls back to the default network list for unknown values', () => {
      expect(getNodeListForNetwork('unknown')).toBe(MAIN_NET_LIST)
    })

    it('defaults to the configured default network when no argument is provided', () => {
      expect(getNodeListForNetwork()).toBe(getNodeListForNetwork(DEFAULT_NETWORK))
    })
  })

  describe('getDefaultNodeForNetwork', () => {
    it('returns the first node from the network list', () => {
      expect(getDefaultNodeForNetwork(NETWORKS.MAIN_NET)).toBe(MAIN_NET_LIST[0])
      expect(getDefaultNodeForNetwork(NETWORKS.TEST_NET)).toBe(TEST_NET_LIST[0])
    })

    it('defaults to the default network when no argument is provided', () => {
      expect(getDefaultNodeForNetwork()).toBe(MAIN_NET_LIST[0])
    })
  })

  describe('isTestNetNetwork', () => {
    it('returns true only for the TEST_NET identifier', () => {
      expect(isTestNetNetwork(NETWORKS.TEST_NET)).toBe(true)
      expect(isTestNetNetwork(NETWORKS.MAIN_NET)).toBe(false)
      expect(isTestNetNetwork('something-else')).toBe(false)
      expect(isTestNetNetwork(undefined)).toBe(false)
    })
  })

  describe('explorer URL helpers', () => {
    it('selects the explorer URL based on the network', () => {
      expect(getExplorerApiBaseUrl(NETWORKS.MAIN_NET)).toBe(EXPLORER_URL[NETWORKS.MAIN_NET])
      expect(getExplorerApiBaseUrl(NETWORKS.TEST_NET)).toBe(EXPLORER_URL[NETWORKS.TEST_NET])
    })

    it('falls back to the default-network URL for unknown values', () => {
      expect(getExplorerApiBaseUrl('unknown')).toBe(EXPLORER_URL[DEFAULT_NETWORK])
      expect(getExplorerPageBaseUrl('unknown')).toBeDefined()
    })

    it('concatenates the path onto the explorer base URL', () => {
      expect(getExplorerApiUrl('/tx/abc', NETWORKS.MAIN_NET)).toBe(
        `${EXPLORER_URL[NETWORKS.MAIN_NET]}/tx/abc`
      )
    })

    it('defaults to the default network when no explicit network is passed', () => {
      expect(getExplorerApiUrl('/tx/abc')).toBe(`${EXPLORER_URL[DEFAULT_NETWORK]}/tx/abc`)
    })
  })

  describe('getOntPassHost', () => {
    it('returns the configured host for MAIN_NET and TEST_NET', () => {
      expect(getOntPassHost(NETWORKS.MAIN_NET)).toContain('service')
      expect(getOntPassHost(NETWORKS.TEST_NET)).toContain('service-test')
    })

    it('falls back to the default network when the value is unknown', () => {
      expect(getOntPassHost('unknown')).toBe(getOntPassHost(DEFAULT_NETWORK))
    })
  })
})
