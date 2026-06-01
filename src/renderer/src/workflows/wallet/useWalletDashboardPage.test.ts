import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  clipboard: {
    copyText: vi.fn(),
  },
  polling: {
    startPolling: vi.fn(),
  },
  feedback: {
    notifyWarning: vi.fn(),
  },
  currentWalletStore: {
    wallet: { address: 'AQ123', key: 'encrypted-key' } as Record<string, unknown>,
    resetNativeBalance: vi.fn(),
    resetCurrentTransfer: vi.fn(),
    setCurrentRedeem: vi.fn(),
  },
  tokensStore: {
    resetOep4Balances: vi.fn(),
  },
  dashboard: {
    refresh: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../shared/composables/useClipboardNotice', () => ({
  useClipboardNotice: () => mocks.clipboard,
}))

vi.mock('../../shared/composables/usePollingTask', () => ({
  usePollingTask: () => mocks.polling,
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('./useWalletDashboard', () => ({
  useWalletDashboard: () => ({
    currentWalletStore: mocks.currentWalletStore,
    tokensStore: mocks.tokensStore,
    balance: ref({
      ong: mocks.currentWalletStore.wallet.ong ?? 1,
      unboundOng: mocks.currentWalletStore.wallet.unboundOng ?? 0,
    }),
    redeemInfoVisible: ref(false),
    refresh: (...args: unknown[]) => mocks.dashboard.refresh(...args),
  }),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
}))

import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useWalletDashboardPage } from './useWalletDashboardPage'

describe('useWalletDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentWalletStore.wallet = {
      address: 'AQ123',
      key: 'encrypted-key',
      ong: 1,
      unboundOng: 0,
    }
  })

  it('resets balances, refreshes immediately, and starts polling on mount', () => {
    useWalletDashboardPage()

    expect(mocks.currentWalletStore.resetNativeBalance).toHaveBeenCalled()
    expect(mocks.tokensStore.resetOep4Balances).toHaveBeenCalled()
    expect(mocks.dashboard.refresh).toHaveBeenCalledWith(true)
    expect(mocks.polling.startPolling).toHaveBeenCalledWith({ immediate: false })
  })

  it('blocks sends without ONG and routes valid send, receive, and back actions', () => {
    mocks.currentWalletStore.wallet.ong = 0
    const blockedPage = useWalletDashboardPage()
    blockedPage.sendAsset()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.ongNoEnough')

    mocks.currentWalletStore.wallet.ong = 1
    const page = useWalletDashboardPage()
    page.sendAsset()
    expect(mocks.currentWalletStore.resetCurrentTransfer).toHaveBeenCalledWith({ gas: 0.01 })
    expect(mocks.router.push).toHaveBeenCalledWith({ name: ROUTE_NAMES.COMMON_SEND_HOME })

    mocks.currentWalletStore.resetCurrentTransfer.mockClear()
    mocks.currentWalletStore.wallet = { address: 'ALedger', ong: 1 }
    useWalletDashboardPage().sendAsset()
    expect(mocks.currentWalletStore.resetCurrentTransfer).toHaveBeenCalledWith({ gas: 0.05 })

    page.commonReceive()
    expect(mocks.router.push).toHaveBeenCalledWith({
      path: ROUTE_PATHS.commonReceive('commonWallet'),
    })
    page.handleBack()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: ROUTE_NAMES.WALLETS })
  })

  it('opens the info modal when no ONG is claimable and routes wallet-specific redemptions', () => {
    const emptyPage = useWalletDashboardPage()
    emptyPage.redeemOng()
    expect(emptyPage.redeemInfoVisible.value).toBe(true)

    mocks.currentWalletStore.wallet.unboundOng = 2
    const commonPage = useWalletDashboardPage()
    commonPage.redeemOng()
    expect(mocks.router.push).toHaveBeenCalledWith({
      path: ROUTE_PATHS.commonRedeem('commonWallet'),
    })

    mocks.currentWalletStore.wallet = {
      address: 'ALedger',
      ong: 1,
      unboundOng: 2,
    }
    const hardwarePage = useWalletDashboardPage()
    hardwarePage.redeemOng()
    expect(mocks.router.push).toHaveBeenCalledWith({
      path: ROUTE_PATHS.commonRedeem('hardwareWallet'),
    })
  })

  it('normalizes clipboard values to strings', async () => {
    const page = useWalletDashboardPage()

    await page.copy(null)
    await page.copy(123)

    expect(mocks.clipboard.copyText).toHaveBeenNthCalledWith(1, '')
    expect(mocks.clipboard.copyText).toHaveBeenNthCalledWith(2, '123')
  })
})
