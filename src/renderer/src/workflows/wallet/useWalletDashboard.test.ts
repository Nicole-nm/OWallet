import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  notifyError: vi.fn(),
  currentWalletStore: {
    balance: {
      ont: 10,
      ontValue: 0,
    },
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

vi.mock('../../modules/wallet/application/walletDashboardApplicationService', () => ({
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

vi.mock('../../modules/wallet/application/tokenSelectionApplicationService', () => ({
  loadSelectableOep4Tokens: (...args: unknown[]) =>
    mocks.tokenSelectionService.loadSelectableOep4Tokens(...args),
  loadSelectedOep4TokenBalances: (...args: unknown[]) =>
    mocks.tokenSelectionService.loadSelectedOep4TokenBalances(...args),
}))

import { useWalletDashboard } from './useWalletDashboard'

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

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

    dashboard.refresh(true)
    await flushPromises()

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
