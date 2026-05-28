import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadNetworkSetting: vi.fn(() => 'MAIN_NET'),
  loadNodeAddressSetting: vi.fn(() => 'https://dappnode1.ont.io'),
  getDefaultNodeAddressForNetwork: vi.fn(() => 'https://dappnode1.ont.io'),
}))

vi.mock('../persistence/appStateService', () => ({
  loadNetworkSetting: mocks.loadNetworkSetting,
  loadNodeAddressSetting: mocks.loadNodeAddressSetting,
  getDefaultNodeAddressForNetwork: mocks.getDefaultNodeAddressForNetwork,
}))

describe('urlBuilder.getNodeUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('builds the HTTPS node URL with the secure REST port', async () => {
    const { getNodeUrl } = await import('./urlBuilder')

    expect(getNodeUrl()).toBe('https://dappnode1.ont.io:10334')
  })

  it('falls back to the default node when none is stored', async () => {
    mocks.loadNetworkSetting.mockReturnValue('TEST_NET')
    mocks.loadNodeAddressSetting.mockReturnValue('')
    mocks.getDefaultNodeAddressForNetwork.mockReturnValue('https://polaris2.ont.io')

    const { getNodeUrl } = await import('./urlBuilder')

    expect(getNodeUrl()).toBe('https://polaris2.ont.io:10334')
  })
})
