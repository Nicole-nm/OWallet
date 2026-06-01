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

const balanceRef = ref({ ont: 100, ong: 5, unboundOng: 1 })
const redeemInfoVisibleRef = ref(false)

vi.mock('./useWalletDashboard', () => ({
  useWalletDashboard: (address: Ref<string>, options: Record<string, unknown>) => {
    mocks.dashboard.address = address
    mocks.dashboard.options = options
    return {
      balance: balanceRef,
      currentWalletStore: mocks.currentWalletStore,
      redeemInfoVisible: redeemInfoVisibleRef,
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

  it('handleBack, showReceive, showTxMgmt, toCopayerDetail and checkMoreOep4 all push routes', () => {
    const page = useSharedWalletHomePage()
    page.handleBack()
    page.showReceive()
    page.showTxMgmt()
    page.toCopayerDetail()
    page.checkMoreOep4()
    expect(mocks.router.push).toHaveBeenCalledTimes(5)
  })

  it('copy copies the shared wallet address', async () => {
    const page = useSharedWalletHomePage()
    await page.copy()
    expect(mocks.clipboard.copyText).toHaveBeenCalledWith('AShared123')
  })

  it('showTransferBox warns when balance ong is below the gas minimum', () => {
    balanceRef.value = { ont: 100, ong: 0, unboundOng: 1 }
    const page = useSharedWalletHomePage()
    page.showTransferBox()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.ongNoEnough')
  })

  it('showTransferBox routes to the send transfer page when balance is sufficient', () => {
    balanceRef.value = { ont: 100, ong: 1000, unboundOng: 1 }
    const page = useSharedWalletHomePage()
    page.showTransferBox()
    expect(mocks.currentWalletStore.resetCurrentTransfer).toHaveBeenCalledWith({ gas: 0.05 })
    expect(mocks.currentWalletStore.setTransferRedeemType).toHaveBeenCalledWith({ type: false })
  })

  it('redeemOng surfaces a redeem info dialog when there is no unbound ong', () => {
    balanceRef.value = { ont: 100, ong: 1000, unboundOng: 0 }
    redeemInfoVisibleRef.value = false
    const page = useSharedWalletHomePage()
    page.redeemOng()
    expect(redeemInfoVisibleRef.value).toBe(true)
  })

  it('redeemOng warns when ong balance is below the gas minimum', () => {
    balanceRef.value = { ont: 100, ong: 0.02, unboundOng: 2 }
    const page = useSharedWalletHomePage()
    page.redeemOng()
    expect(mocks.currentWalletStore.resetCurrentTransfer).not.toHaveBeenCalled()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.ongNoEnough')
  })

  it('redeemOng completes the redeem flow when balances allow it', () => {
    balanceRef.value = { ont: 100, ong: 1000, unboundOng: 2 }
    const page = useSharedWalletHomePage()
    page.redeemOng()
    expect(mocks.currentWalletStore.resetCurrentTransfer).toHaveBeenCalledWith({ gas: 0.05 })
    expect(mocks.currentWalletStore.setCurrentRedeem).toHaveBeenCalledWith({
      redeem: { claimableOng: 2, balanceOng: 1000 },
    })
    expect(mocks.currentWalletStore.setTransferRedeemType).toHaveBeenCalledWith({ type: true })
  })

  it('pendingTxDetail warns when the required number of signatures is already reached', () => {
    const page = useSharedWalletHomePage()
    page.pendingTxDetail({
      coPayerSignDtos: [{ isSign: true }, { isSign: true }],
      receiveaddress: 'AOther',
      sendaddress: 'AShared123',
      assetName: 'ONT',
    } as never)
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('sharedWalletHome.txSendingTochain')
  })

  it('pendingTxDetail flips into redeem mode for self-redeem ONG transactions', () => {
    const page = useSharedWalletHomePage()
    page.pendingTxDetail({
      coPayerSignDtos: [{ isSign: false }],
      receiveaddress: 'AShared123',
      sendaddress: 'AShared123',
      assetName: 'ONG',
    } as never)
    expect(mocks.currentWalletStore.setPendingTx).toHaveBeenCalled()
    expect(mocks.currentWalletStore.setTransferRedeemType).toHaveBeenCalledWith({ type: true })
  })

  it('reports an error when loadPendingSharedTransfers fails', async () => {
    mocks.overview.loadPendingSharedTransfers.mockResolvedValueOnce({
      ok: false,
      errorKey: 'common.someError',
    })
    const page = useSharedWalletHomePage()
    await page.refresh(false)
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('common.someError')
  })

  it('falls back to the default error key when loadPendingSharedTransfers fails without one', async () => {
    mocks.overview.loadPendingSharedTransfers.mockResolvedValueOnce({ ok: false })
    const page = useSharedWalletHomePage()
    await page.refresh(false)
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('common.networkErr')
  })

  it('marks hasLocalCopayer false when the check returns ok=false', async () => {
    mocks.overview.checkSharedWalletHasLocalCopayer.mockResolvedValueOnce({ ok: false })
    const page = useSharedWalletHomePage()
    // ifHasLocalCopayer is called during onMounted; we let microtasks settle.
    await Promise.resolve()
    await Promise.resolve()
    expect(page.hasLocalCopayer.value).toBe(false)
  })
})
