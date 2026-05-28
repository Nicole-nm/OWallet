import { beforeEach, describe, expect, it, vi } from 'vitest'

type StakeWalletMock = { address: string; label?: string }

function createDeferred<T = unknown>() {
  let resolvePromise: (value: T) => void = () => {}
  const promise = new Promise<T>((nextResolve) => {
    resolvePromise = nextResolve
  })

  return {
    promise,
    resolve: (value: T) => resolvePromise(value),
  }
}

const mocks = vi.hoisted(() => {
  const nodeAuthStore = {
    stakeHistory: [] as unknown[],
    setCurrentNode: vi.fn(),
    setStakeAuthorizationWallet: vi.fn(),
    setStakeHistory: vi.fn((payload) => {
      nodeAuthStore.stakeHistory = Array.isArray(payload.stakeHistory) ? payload.stakeHistory : []
    }),
    resetStakeHistory: vi.fn(() => {
      nodeAuthStore.stakeHistory = []
    }),
  }

  const selection = {
    currentWallet: null as StakeWalletMock | null,
    ensureWalletsLoaded: vi.fn(),
    restoreSelectedWallet: vi.fn((wallet) => {
      selection.currentWallet = wallet || null
      return selection.currentWallet
    }),
    resolveSelectedWallet: vi.fn(() => selection.currentWallet),
    cleanupSelection: vi.fn(() => {
      selection.currentWallet = null
    }),
    setSelectedWalletByAddress: vi.fn((address) => {
      const wallet: StakeWalletMock | null = address ? { address } : null
      selection.currentWallet = wallet
      return wallet
    }),
    selectedWalletValue: undefined,
    selectedWallet: null as StakeWalletMock | null,
    walletOptions: [] as StakeWalletMock[],
    ledgerStatus: undefined,
    ledgerPk: undefined,
    ledgerWallet: undefined,
  }

  return {
    router: {
      push: vi.fn(),
      go: vi.fn(),
    },
    settingStore: {
      network: 'TestNet',
    },
    nodeAuthStore,
    nodeStakeStore: {
      stakeWallet: { address: 'AQ-initial' },
      setStakeWallet: vi.fn(),
      setNodePublicKey: vi.fn(),
      setNodeStatus: vi.fn(),
    },
    nodeSessionStore: {
      selectNodeContext: vi.fn(),
      setActiveManagementTab: vi.fn(),
    },
    selection,
    queryService: {
      loadAuthorizationStakeHistory: vi.fn(),
    },
    authorizationContextService: {
      openAuthorizationManagement: vi.fn(),
    },
    feedback: {
      notifyError: vi.fn(),
    },
  }
})

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: (callback: (...args: unknown[]) => unknown) => callback(),
    onBeforeUnmount: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../stores/modules/NodeAuthorization', () => ({
  useNodeAuthorizationStore: () => mocks.nodeAuthStore,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock('../../modules/governance/store/nodeSessionStore', () => ({
  useNodeSessionStore: () => mocks.nodeSessionStore,
}))

vi.mock('./useStakeWalletSelection', () => ({
  useStakeWalletSelection: () => mocks.selection,
}))

vi.mock('../../modules/governance/application/authorizationQueryApplicationService', () => ({
  loadAuthorizationStakeHistory: (...args: unknown[]) =>
    mocks.queryService.loadAuthorizationStakeHistory(...args),
}))

vi.mock('../../modules/governance/application/authorizationContextService', () => ({
  openAuthorizationManagement: (...args: unknown[]) =>
    mocks.authorizationContextService.openAuthorizationManagement(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
}))

import { ROUTE_NAMES } from '../../router/routes'
import { useStakeHistoryPage } from './useStakeHistoryPage'

describe('useStakeHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.nodeAuthStore.stakeHistory = []
    mocks.selection.currentWallet = null
    mocks.selection.ensureWalletsLoaded.mockResolvedValue([])
    mocks.queryService.loadAuthorizationStakeHistory.mockResolvedValue({
      ok: true,
      stakeHistory: [{ txHash: 'tx-1' }],
    })
    mocks.authorizationContextService.openAuthorizationManagement.mockImplementation(
      ({ currentNode, stakeWallet }) => ({
        ok: true,
        route: { name: ROUTE_NAMES.AUTHORIZATION_MGMT },
        authorizationContext: {
          currentNode,
          stakeWallet,
        },
        managementContext: {
          stakeWallet,
          nodePublicKey: currentNode.pk || currentNode.publicKey || '',
          status: currentNode.status || '',
          activeTab: 2,
        },
      })
    )
  })

  it('loads wallets and clears the previous stake wallet selection on mount', async () => {
    useStakeHistoryPage()
    await Promise.resolve()

    expect(mocks.selection.ensureWalletsLoaded).toHaveBeenCalledTimes(1)
    expect(mocks.selection.cleanupSelection).toHaveBeenCalledTimes(1)
    expect(mocks.nodeStakeStore.setStakeWallet).toHaveBeenCalledWith()
    expect(mocks.nodeAuthStore.resetStakeHistory).toHaveBeenCalledTimes(1)
    expect(mocks.selection.restoreSelectedWallet).not.toHaveBeenCalled()
  })

  it('refreshes stake history immediately after wallet selection changes', async () => {
    const page = useStakeHistoryPage()

    await page.handleChangePayer({ wallet: { address: 'AQ-next' } })

    expect(mocks.selection.setSelectedWalletByAddress).toHaveBeenCalledWith('AQ-next')
    expect(mocks.nodeAuthStore.resetStakeHistory).toHaveBeenCalledTimes(2)
    expect(mocks.nodeStakeStore.setStakeWallet).toHaveBeenCalledWith({
      stakeWallet: { address: 'AQ-next' },
    })
    expect(mocks.queryService.loadAuthorizationStakeHistory).toHaveBeenCalledWith({
      network: 'TestNet',
      address: 'AQ-next',
    })
    expect(mocks.nodeAuthStore.setStakeHistory).toHaveBeenCalledWith({
      stakeHistory: [{ txHash: 'tx-1' }],
    })
    expect(page.historyRecords.value).toEqual([{ txHash: 'tx-1' }])
    expect(mocks.feedback.notifyError).not.toHaveBeenCalled()
  })

  it('keeps only the latest query result when wallets are switched quickly', async () => {
    const first = createDeferred()
    const second = createDeferred()
    mocks.queryService.loadAuthorizationStakeHistory
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const page = useStakeHistoryPage()
    const firstSearch = page.handleChangePayer({ wallet: { address: 'AQ-first' } })
    const secondSearch = page.handleChangePayer({ wallet: { address: 'AQ-second' } })

    second.resolve({ ok: true, stakeHistory: [{ txHash: 'tx-second' }] })
    await secondSearch
    first.resolve({ ok: true, stakeHistory: [{ txHash: 'tx-first' }] })
    await firstSearch

    expect(mocks.nodeAuthStore.setStakeHistory).toHaveBeenCalledTimes(1)
    expect(mocks.nodeAuthStore.setStakeHistory).toHaveBeenCalledWith({
      stakeHistory: [{ txHash: 'tx-second' }],
    })
    expect(mocks.nodeAuthStore.stakeHistory).toEqual([{ txHash: 'tx-second' }])
    expect(page.historyRecords.value).toEqual([{ txHash: 'tx-second' }])
  })

  it('notifies on auto-refresh failure and leaves the table empty', async () => {
    mocks.queryService.loadAuthorizationStakeHistory.mockResolvedValue({
      ok: false,
      errorKey: 'common.networkErr',
      stakeHistory: [] as unknown[],
    })
    const page = useStakeHistoryPage()

    await page.handleChangePayer({ wallet: { address: 'AQ-error' } })

    expect(mocks.nodeAuthStore.resetStakeHistory).toHaveBeenCalledTimes(2)
    expect(mocks.nodeAuthStore.setStakeHistory).toHaveBeenCalledWith({
      stakeHistory: [] as unknown[],
    })
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('common.networkErr')
    expect(mocks.nodeAuthStore.stakeHistory).toEqual([])
    expect(page.historyRecords.value).toEqual([])
  })

  it('applies authorization context and navigates to authorization management', () => {
    const page = useStakeHistoryPage()
    const selectedWallet = { address: 'AQ-selected', label: 'Wallet A' }
    const record = { pk: 'pk-1', stakeWallet: 'AQ-record', status: 'Consensus' }
    mocks.selection.resolveSelectedWallet.mockReturnValue(selectedWallet)

    page.handleAuthorizeLogin(record)

    expect(mocks.authorizationContextService.openAuthorizationManagement).toHaveBeenCalledWith({
      currentNode: record,
      stakeWallet: selectedWallet,
    })
    expect(mocks.nodeAuthStore.setCurrentNode).toHaveBeenCalledWith({
      currentNode: record,
    })
    expect(mocks.nodeAuthStore.setStakeAuthorizationWallet).toHaveBeenCalledWith({
      stakeWallet: selectedWallet,
    })
    expect(mocks.nodeSessionStore.selectNodeContext).toHaveBeenCalledWith({
      stakeWallet: selectedWallet,
      nodePublicKey: 'pk-1',
      status: 'Consensus',
    })
    expect(mocks.nodeSessionStore.setActiveManagementTab).toHaveBeenCalledWith(2)
    expect(mocks.nodeStakeStore.setStakeWallet).toHaveBeenCalledWith({
      stakeWallet: selectedWallet,
    })
    expect(mocks.nodeStakeStore.setNodePublicKey).toHaveBeenCalledWith({
      nodePublicKey: 'pk-1',
    })
    expect(mocks.nodeStakeStore.setNodeStatus).toHaveBeenCalledWith({
      status: 'Consensus',
    })
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'AuthorizationMgmt' })
  })

  it('falls back to the row wallet address when no selected wallet is available', () => {
    const page = useStakeHistoryPage()
    const record = { pk: 'pk-fallback', stakeWallet: 'AQ-fallback' }
    mocks.selection.resolveSelectedWallet.mockReturnValue(null)

    page.handleAuthorizeLogin(record)

    expect(mocks.authorizationContextService.openAuthorizationManagement).toHaveBeenCalledWith({
      currentNode: record,
      stakeWallet: { address: 'AQ-fallback' },
    })
    expect(mocks.nodeAuthStore.setStakeAuthorizationWallet).toHaveBeenCalledWith({
      stakeWallet: { address: 'AQ-fallback' },
    })
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'AuthorizationMgmt' })
  })
})
