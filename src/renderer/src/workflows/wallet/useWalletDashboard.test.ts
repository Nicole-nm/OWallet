import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  notifyError: vi.fn(),
  showAppError: vi.fn(),
  loggerError: vi.fn(),
  currentWalletStore: {
    balance: {
      ont: 10,
      ontValue: 0,
    } as Record<string, unknown>,
    setNativeBalance: vi.fn(function setNativeBalance(
      this: { balance: unknown },
      balance: unknown
    ) {
      this.balance = balance
    }),
  },
  tokensStore: {
    oep4Tokens: {
      testnet: {
        token1: {
          contract_hash: 'hash-1',
          symbol: 'TK1',
          selected: true,
        },
      },
    },
    oep4WithBalances: [] as unknown[],
    setOep4Token: vi.fn(),
    setOep4Balances: vi.fn(function setOep4Balances(
      this: { oep4WithBalances: unknown[] },
      balances: unknown[]
    ) {
      this.oep4WithBalances = balances
    }),
  },
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  settingStore: {
    network: 'testnet',
  },
  walletDashboardService: {
    getWalletAddressExplorerUrl: vi.fn(),
    getWalletTransactionExplorerUrl: vi.fn(),
    loadWalletExchangeValue: vi.fn(),
    loadWalletNativeBalance: vi.fn(),
    loadWalletTransactions: vi.fn(),
  },
  tokenSelectionService: {
    loadSelectableOep4Tokens: vi.fn(),
    loadSelectedOep4TokenBalances: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: unknown) => key,
  }),
}))

vi.mock('../../shared/platform/urlOpener', () => ({
  open: (...args: unknown[]) => mocks.open(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.notifyError(...args),
  showAppError: (...args: unknown[]) => mocks.showAppError(...args),
}))

vi.mock('../../shared/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mocks.loggerError(...args),
  },
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('../../stores/modules/Tokens', () => ({
  useTokensStore: () => mocks.tokensStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../modules/wallet/application/dashboard/walletDashboardApplicationService', () => ({
  getWalletAddressExplorerUrl: (...args: unknown[]) =>
    mocks.walletDashboardService.getWalletAddressExplorerUrl(...args),
  getWalletTransactionExplorerUrl: (...args: unknown[]) =>
    mocks.walletDashboardService.getWalletTransactionExplorerUrl(...args),
  loadWalletExchangeValue: (...args: unknown[]) =>
    mocks.walletDashboardService.loadWalletExchangeValue(...args),
  loadWalletNativeBalance: (...args: unknown[]) =>
    mocks.walletDashboardService.loadWalletNativeBalance(...args),
  loadWalletTransactions: (...args: unknown[]) =>
    mocks.walletDashboardService.loadWalletTransactions(...args),
}))

vi.mock('../../modules/wallet/application/transfer/tokenSelectionApplicationService', () => ({
  loadSelectableOep4Tokens: (...args: unknown[]) =>
    mocks.tokenSelectionService.loadSelectableOep4Tokens(...args),
  loadSelectedOep4TokenBalances: (...args: unknown[]) =>
    mocks.tokenSelectionService.loadSelectedOep4TokenBalances(...args),
}))

import { useWalletDashboard } from './useWalletDashboard'

describe('useWalletDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentWalletStore.balance = {
      ont: 10,
      ontValue: 0,
    }
    mocks.tokensStore.oep4WithBalances = []
    mocks.walletDashboardService.getWalletAddressExplorerUrl.mockReturnValue(
      'https://example.com/address'
    )
    mocks.walletDashboardService.getWalletTransactionExplorerUrl.mockReturnValue(
      'https://example.com/tx'
    )
    mocks.walletDashboardService.loadWalletNativeBalance.mockResolvedValue({
      ok: true,
      balance: {
        ont: 10,
        ong: 5,
        ontValue: 0,
      },
    })
    mocks.walletDashboardService.loadWalletTransactions.mockResolvedValue({
      ok: true,
      transactions: [{ txHash: 'tx-1', asset: 'ONT', amount: '+10' }],
    })
    mocks.walletDashboardService.loadWalletExchangeValue.mockResolvedValue({
      ok: true,
      value: 42,
    })
    mocks.tokenSelectionService.loadSelectedOep4TokenBalances.mockResolvedValue({
      ok: true,
      balances: [{ symbol: 'TK1', balance: 99 }],
    })
    mocks.tokenSelectionService.loadSelectableOep4Tokens.mockResolvedValue({
      ok: true,
      total: 1,
      list: [
        {
          contract_hash: 'hash-1',
          decimals: 9,
          symbol: 'TK1',
          selected: true,
        },
      ],
    })
  })

  it('refreshes wallet balances, tokens, and transactions through application services', async () => {
    const address = ref('AQ123')
    const dashboard = useWalletDashboard(address)

    await expect(dashboard.refresh(true)).resolves.toMatchObject({
      ok: true,
      skipped: false,
      successCount: 3,
      failureCount: 0,
      failures: [],
    })

    expect(mocks.loadingStore.showLoadingModals).toHaveBeenCalled()
    expect(mocks.currentWalletStore.setNativeBalance).toHaveBeenCalledWith({
      balance: {
        ont: 10,
        ong: 5,
        ontValue: 0,
      },
    })
    expect(mocks.tokensStore.setOep4Balances).toHaveBeenCalledWith([{ symbol: 'TK1', balance: 99 }])
    expect(dashboard.completedTx.value).toEqual([{ txHash: 'tx-1', asset: 'ONT', amount: '+10' }])
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    expect(dashboard.requestStart.value).toBe(false)
  })

  it('reports refresh failures and always clears loading state', async () => {
    const error = new Error('transactions failed')
    mocks.walletDashboardService.loadWalletTransactions.mockRejectedValueOnce(error)
    const dashboard = useWalletDashboard(ref('AQ123'))

    await expect(dashboard.refresh(true)).resolves.toMatchObject({
      ok: false,
      skipped: false,
      successCount: 2,
      failureCount: 1,
      failures: [error],
    })

    expect(mocks.loadingStore.showLoadingModals).toHaveBeenCalled()
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    expect(dashboard.requestStart.value).toBe(false)
    expect(mocks.loggerError).toHaveBeenCalledWith('useWalletDashboard.refresh', error)
    expect(mocks.showAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'unknown',
        errorKey: 'common.unexpectedError',
        detail: expect.stringContaining('dashboard:'),
      })
    )
  })

  it('coalesces refresh balance failures into one dashboard toast', async () => {
    mocks.walletDashboardService.loadWalletNativeBalance.mockResolvedValueOnce({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
    mocks.tokenSelectionService.loadSelectedOep4TokenBalances.mockResolvedValueOnce({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
    const dashboard = useWalletDashboard(ref('AQ123'))

    await expect(dashboard.refresh(true)).resolves.toMatchObject({
      ok: false,
      skipped: false,
      successCount: 1,
      failureCount: 2,
    })

    expect(mocks.notifyError).not.toHaveBeenCalled()
    expect(mocks.showAppError).toHaveBeenCalledTimes(1)
    expect(mocks.showAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'network',
        errorKey: 'dashboard.getBalanceErr',
        detail: expect.stringContaining('dashboard:'),
      })
    )
  })

  it('still shows the balance toast when getBalance is called directly', async () => {
    mocks.walletDashboardService.loadWalletNativeBalance.mockResolvedValueOnce({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
    const dashboard = useWalletDashboard(ref('AQ123'))

    await expect(dashboard.getBalance()).resolves.toBeNull()

    expect(mocks.notifyError).toHaveBeenCalledWith('dashboard.getBalanceErr', { literal: true })
    expect(mocks.showAppError).not.toHaveBeenCalled()
  })

  it('resolves a rapid second refresh as skipped while the first remains in flight', async () => {
    let resolveBalance!: (value: unknown) => void
    mocks.walletDashboardService.loadWalletNativeBalance.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBalance = resolve
      })
    )
    const dashboard = useWalletDashboard(ref('AQ123'))

    const firstRefresh = dashboard.refresh(true)
    expect(dashboard.requestStart.value).toBe(true)

    await expect(dashboard.refresh(false)).resolves.toMatchObject({
      ok: true,
      skipped: true,
      successCount: 0,
      failureCount: 0,
      failures: [],
    })

    resolveBalance({
      ok: true,
      balance: {
        ont: 10,
        ong: 5,
        ontValue: 0,
      },
    })
    await expect(firstRefresh).resolves.toMatchObject({ ok: true, skipped: false })
    expect(dashboard.requestStart.value).toBe(false)
  })

  it('exposes thin-space formatted wallet balance display values', () => {
    mocks.currentWalletStore.balance = {
      ont: 1234567,
      ong: '12345.6789',
      unboundOng: 1000,
      waitBoundOng: 2000,
      ontValue: 0,
    }
    mocks.tokensStore.oep4WithBalances = [{ symbol: 'TK1', balance: '9876543.21' }]

    const dashboard = useWalletDashboard(ref('AQ123'))

    expect(dashboard.balanceDisplay.value.ont).toBe('1\u2009234\u2009567')
    expect(dashboard.balanceDisplay.value.ong).toBe('12\u2009345.6789')
    expect(dashboard.balanceDisplay.value.unboundOng).toBe('1\u2009000')
    expect(dashboard.balanceDisplay.value.waitBoundOng).toBe('2\u2009000')
    expect(dashboard.oep4sDisplay.value[0]).toEqual({
      symbol: 'TK1',
      balance: '9876543.21',
      balanceDisplay: '9\u2009876\u2009543.21',
    })
  })

  it('opens explorer links and applies exchange rates to the current balance', async () => {
    const dashboard = useWalletDashboard(ref('AQ123'))

    dashboard.checkMoreTx()
    dashboard.showTxDetail('tx-1')
    await dashboard.getExchangeCurrency()

    expect(mocks.open).toHaveBeenNthCalledWith(1, 'https://example.com/address')
    expect(mocks.open).toHaveBeenNthCalledWith(2, 'https://example.com/tx')
    expect(mocks.currentWalletStore.setNativeBalance).toHaveBeenCalledWith({
      balance: { ont: 10, ontValue: 42 },
    })
  })

  it('loads selectable OEP4 tokens in the workflow and updates token selection locally', async () => {
    const dashboard = useWalletDashboard(ref('AQ123'))

    await dashboard.handleOep4SelectionOpenChange(true)
    dashboard.toggleOep4Selection({
      contract_hash: 'hash-1',
      decimal: 9,
      symbol: 'TK1',
      selected: true,
    })

    expect(mocks.tokenSelectionService.loadSelectableOep4Tokens).toHaveBeenCalledWith({
      pageSize: 10,
      pageNumber: 1,
      selectedTokensByNetwork: mocks.tokensStore.oep4Tokens.testnet,
    })
    expect(dashboard.oep4SelectionItems.value).toEqual([
      {
        contract_hash: 'hash-1',
        decimal: 9,
        symbol: 'TK1',
        selected: false,
      },
    ])
    expect(mocks.tokensStore.setOep4Token).toHaveBeenCalledWith('testnet', {
      contract_hash: 'hash-1',
      decimal: 9,
      symbol: 'TK1',
      selected: false,
    })
  })
})
