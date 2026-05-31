import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'

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
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
  },
  overview: {
    checkSharedWalletHasLocalCopayer: vi.fn(),
    loadPendingSharedTransfers: vi.fn(),
  },
  sharedWalletSessionStore: {
    wallet: {
      sharedWalletAddress: 'AShared123',
      sharedWalletName: 'Core Team',
      coPayers: [],
      requiredNumber: 2,
      totalNumber: 3,
    },
  },
  currentWalletStore: {
    mergeCurrentWallet: vi.fn(),
    resetCurrentTransfer: vi.fn(),
    resetNativeBalance: vi.fn(),
    setCurrentRedeem: vi.fn(),
    setPendingTx: vi.fn(),
    setTransferRedeemType: vi.fn(),
  },
  tokensStore: {
    resetOep4Balances: vi.fn(),
  },
  settingStore: {
    network: 'MAIN_NET',
  },
  dashboard: {
    address: null as Ref<string> | null,
    options: null as Record<string, unknown> | null,
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

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock('../../stores/modules/SharedWalletSession', () => ({
  useSharedWalletSessionStore: () => mocks.sharedWalletSessionStore,
}))

vi.mock(
  '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService',
  () => ({
    checkSharedWalletHasLocalCopayer: (...args: unknown[]) =>
      mocks.overview.checkSharedWalletHasLocalCopayer(...args),
    loadPendingSharedTransfers: (...args: unknown[]) =>
      mocks.overview.loadPendingSharedTransfers(...args),
  })
)

vi.mock('./useWalletDashboard', () => ({
  useWalletDashboard: (address: Ref<string>, options: Record<string, unknown>) => {
    mocks.dashboard.address = address
    mocks.dashboard.options = options
    return {
      balance: ref({ ont: 100, ong: 5, unboundOng: 1 }),
      currentWalletStore: mocks.currentWalletStore,
      redeemInfoVisible: ref(false),
      refresh: (...args: unknown[]) => mocks.dashboard.refresh(...args),
      settingStore: mocks.settingStore,
      tokensStore: mocks.tokensStore,
    }
  },
}))

import { useSharedWalletHomePage } from './useSharedWalletHomePage'

describe('useSharedWalletHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.dashboard.address = null
    mocks.dashboard.options = null
    mocks.dashboard.refresh.mockImplementation(
      async (_showLoading: boolean, tasks: Array<() => unknown> = []) => {
        await Promise.all(tasks.map((task) => task()))
        return { ok: true }
      }
    )
    mocks.overview.checkSharedWalletHasLocalCopayer.mockResolvedValue({
      ok: true,
      hasLocalCopayer: true,
    })
    mocks.overview.loadPendingSharedTransfers.mockResolvedValue({
      ok: true,
      transfers: [],
    })
  })

  it('clears cached balances before refreshing the shared wallet dashboard', () => {
    useSharedWalletHomePage()

    expect(mocks.currentWalletStore.resetNativeBalance).toHaveBeenCalledTimes(1)
    expect(mocks.tokensStore.resetOep4Balances).toHaveBeenCalledTimes(1)
    expect(mocks.currentWalletStore.mergeCurrentWallet).toHaveBeenCalledWith({
      wallet: {
        address: 'AShared123',
        name: 'Core Team',
      },
    })
    expect(mocks.dashboard.address?.value).toBe('AShared123')
    expect(mocks.dashboard.options).toEqual({
      filterGovernanceOng: true,
      txSliceCount: 6,
    })
    expect(mocks.dashboard.refresh).toHaveBeenCalledWith(true, [expect.any(Function)])
    expect(mocks.polling.startPolling).toHaveBeenCalledWith({ immediate: false })
  })

  it('loads pending transfers with the shared wallet address', async () => {
    const page = useSharedWalletHomePage()

    await page.refresh(false)

    expect(mocks.overview.loadPendingSharedTransfers).toHaveBeenCalledWith({
      network: 'MAIN_NET',
      sharedWalletAddress: 'AShared123',
    })
  })
})
