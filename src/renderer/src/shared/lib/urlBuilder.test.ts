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

describe('urlBuilder explorer API endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadNetworkSetting.mockReturnValue('MAIN_NET')
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('builds a transaction-list URL with default pagination', async () => {
    const { getTransactionListUrl } = await import('./urlBuilder')
    expect(getTransactionListUrl('AN5fHotAddr')).toContain(
      '/v2/addresses/AN5fHotAddr/transactions?page_size=10&page_number=1'
    )
  })

  it('builds a transaction-list URL with explicit pagination', async () => {
    const { getTransactionListUrl } = await import('./urlBuilder')
    expect(getTransactionListUrl('AN5fHotAddr', 25, 3)).toContain('page_size=25&page_number=3')
  })

  it('builds a native-balance URL using the default token type', async () => {
    const { getBalanceUrl } = await import('./urlBuilder')
    expect(getBalanceUrl('AN5fHotAddr')).toContain('/v2/addresses/AN5fHotAddr/NATIVE/balances')
  })

  it('builds a token-typed balance URL when a tokenType is passed', async () => {
    const { getBalanceUrl } = await import('./urlBuilder')
    expect(getBalanceUrl('AN5fHotAddr', 'oep4')).toContain(
      '/v2/addresses/AN5fHotAddr/oep4/balances'
    )
  })

  it('builds a token-list URL with default tokenType and pagination', async () => {
    const { getTokenListUrl } = await import('./urlBuilder')
    expect(getTokenListUrl()).toContain('/v2/tokens/oep4?page_size=10&page_number=1')
  })

  it('builds a token-list URL with explicit tokenType and pagination', async () => {
    const { getTokenListUrl } = await import('./urlBuilder')
    expect(getTokenListUrl('oep8', 5, 2)).toContain('/v2/tokens/oep8?page_size=5&page_number=2')
  })

  it('builds a token-balance URL', async () => {
    const { getTokenBalanceUrl } = await import('./urlBuilder')
    expect(getTokenBalanceUrl('oep4', 'AN5fHotAddr')).toContain(
      '/v2/addresses/AN5fHotAddr/oep4/balances'
    )
  })
})

describe('urlBuilder explorer page URLs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadNetworkSetting.mockReturnValue('MAIN_NET')
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('omits the /testnet suffix for the main-net transaction page', async () => {
    const { getExplorerTxPageUrl } = await import('./urlBuilder')
    const url = getExplorerTxPageUrl('0xdeadbeef', 'MAIN_NET')
    expect(url).toContain('/transaction/0xdeadbeef')
    expect(url).not.toContain('/testnet')
  })

  it('appends the /testnet suffix for the test-net transaction page', async () => {
    const { getExplorerTxPageUrl } = await import('./urlBuilder')
    const url = getExplorerTxPageUrl('0xdeadbeef', 'TEST_NET')
    expect(url).toContain('/transaction/0xdeadbeef/testnet')
  })

  it('omits the /testnet suffix for the main-net address page with default pagination', async () => {
    const { getExplorerAddressPageUrl } = await import('./urlBuilder')
    const url = getExplorerAddressPageUrl('AN5fHotAddr', 'MAIN_NET')
    expect(url).toContain('/address/AN5fHotAddr/10/1')
    expect(url).not.toContain('/testnet')
  })

  it('appends the /testnet suffix for the test-net address page with custom pagination', async () => {
    const { getExplorerAddressPageUrl } = await import('./urlBuilder')
    const url = getExplorerAddressPageUrl('AN5fHotAddr', 'TEST_NET', 25, 3)
    expect(url).toContain('/address/AN5fHotAddr/25/3/testnet')
  })
})
