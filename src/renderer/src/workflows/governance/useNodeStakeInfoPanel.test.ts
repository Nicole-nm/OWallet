import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    go: vi.fn(),
    push: vi.fn(),
  },
  nodeStakeStore: {
    detail: {
      pk: '',
      peerPubkey: '',
      publicKey: '',
      nodePublicKey: '',
      name: '',
      nodeAddress: '',
      ontid: '',
      contract: '',
      stakeWalletAddress: '',
      commitmentQuantity: 999,
      transactionHash: '',
      status: 8,
    },
    nodePublicKey: 'pk-1',
    stakeWallet: { address: 'AQ123', key: 'wallet-key' },
    stakeIdentity: { ontid: 'did:ont:abc', label: 'ID', controls: [] },
    setStakeDetail: vi.fn((payload?: { detail?: Record<string, unknown> }) => {
      mocks.nodeStakeStore.detail = (payload?.detail as never) || {
        pk: '',
        peerPubkey: '',
        publicKey: '',
        nodePublicKey: '',
        name: '',
        nodeAddress: '',
        ontid: '',
        contract: '',
        stakeWalletAddress: '',
        commitmentQuantity: 0,
        transactionHash: '',
        status: 0,
      }
    }),
  },
  nodeAuthStore: {
    currentPeer: {
      peerPubkey: '',
      address: '',
      status: 8,
      initPos: 888,
      initPosStr: '888',
      totalPos: 0,
      totalPosStr: '0',
    },
    authorizationInfo: {
      consensusPos: 0,
      freezePos: 0,
      newPos: 0,
      withdrawPos: 0,
      withdrawFreezePos: 0,
      withdrawUnfreezePos: 0,
      inAuthorization: '0',
      locked: '777',
      claimable: '666',
      claimableVal: 666,
      newStakePortion: '0',
      receiveProfitPortion: '0',
    },
    posLimit: 10,
    setCurrentPeer: vi.fn((payload?: { peer?: Record<string, unknown> }) => {
      mocks.nodeAuthStore.currentPeer = (payload?.peer as never) || {
        peerPubkey: '',
        address: '',
        status: 0,
        initPos: 0,
        initPosStr: '0',
        totalPos: 0,
        totalPosStr: '0',
      }
    }),
    setAuthorizationInfo: vi.fn((payload?: { authorizationInfo?: Record<string, unknown> }) => {
      mocks.nodeAuthStore.authorizationInfo = (payload?.authorizationInfo as never) || {
        consensusPos: 0,
        freezePos: 0,
        newPos: 0,
        withdrawPos: 0,
        withdrawFreezePos: 0,
        withdrawUnfreezePos: 0,
        inAuthorization: '0',
        locked: '0',
        claimable: '0',
        claimableVal: 0,
        newStakePortion: '0',
        receiveProfitPortion: '0',
      }
    }),
    setPosLimit: vi.fn((payload?: { posLimit?: number }) => {
      mocks.nodeAuthStore.posLimit = payload?.posLimit ?? 10
    }),
  },
  settingStore: {
    network: 'testnet',
  },
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  polling: {
    intervalId: 0,
    startPolling: vi.fn(),
  },
  nodeStakeService: {
    refreshNodeStakeManagementDetails: vi.fn(),
  },
  transactions: {
    handleWalletSignOK: vi.fn(),
    handleRecall: vi.fn(),
    handleRefund: vi.fn(),
    handleQuitNode: vi.fn(),
    validateAddPos: vi.fn(),
    validateReducePos: vi.fn(),
    handleAddPosOk: vi.fn(),
    handleReducePosOk: vi.fn(),
    handleRedeemPosOk: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock('../../stores/modules/NodeAuthorization', () => ({
  useNodeAuthorizationStore: () => mocks.nodeAuthStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../shared/composables/usePollingTask', () => ({
  usePollingTask: () => mocks.polling,
}))

vi.mock('../../modules/wallet/composables/useLedgerStatusMonitor', () => ({
  useLedgerStatusMonitor: () => ({
    ledgerStatus: 'Ready',
    ledgerPk: '',
    ledgerWallet: { address: '' },
  }),
}))

vi.mock(
  '../../modules/governance/application/nodeStake/nodeStakeManagementApplicationService',
  () => ({
    refreshNodeStakeManagementDetails: (...args: unknown[]) =>
      mocks.nodeStakeService.refreshNodeStakeManagementDetails(...args),
  })
)

vi.mock('./useNodeStakeTransactions', () => ({
  useNodeStakeTransactions: () => mocks.transactions,
}))

import { useNodeStakeInfoPanel } from './useNodeStakeInfoPanel'

describe('useNodeStakeInfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.nodeStakeStore.detail.commitmentQuantity = 999
    mocks.nodeAuthStore.currentPeer.initPos = 888
    mocks.nodeAuthStore.authorizationInfo.locked = '777'
    mocks.nodeAuthStore.authorizationInfo.claimable = '666'
  })

  it('resets stale stake amounts before loading fresh management details', async () => {
    let resolveRefresh: (value: unknown) => void = () => {}
    mocks.nodeStakeService.refreshNodeStakeManagementDetails.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve
      })
    )

    const page = useNodeStakeInfoPanel()
    const initialization = page.initializeStakeInfo()

    expect(page.commitmentQuantityDisplay.value).toBe('0')
    expect(page.stakeQuantityDisplay.value).toBe('0')
    expect(page.lockedQuantityDisplay.value).toBe('0')
    expect(page.claimableQuantityDisplay.value).toBe('0')
    expect(page.stakeStatusLoaded.value).toBe(false)

    resolveRefresh({
      ok: true,
      detail: { commitmentQuantity: 123 },
      currentPeer: { initPos: 456 },
      posLimit: 10,
      authorizationInfo: { locked: '789', claimable: '321' },
      stakeStatus: {
        status1: 'Transferred',
        status2: 'Audited',
        status3: 'Staked',
        current: 2,
        statusTip: '',
      },
    })
    await initialization
    expect(page.stakeStatusLoaded.value).toBe(true)

    expect(mocks.nodeStakeStore.setStakeDetail).toHaveBeenNthCalledWith(1)
    expect(mocks.nodeStakeStore.setStakeDetail).toHaveBeenLastCalledWith({
      detail: { commitmentQuantity: 123 },
    })
    expect(mocks.nodeAuthStore.setCurrentPeer).toHaveBeenLastCalledWith({ peer: { initPos: 456 } })
    expect(mocks.nodeAuthStore.setAuthorizationInfo).toHaveBeenLastCalledWith({
      authorizationInfo: { locked: '789', claimable: '321' },
    })
    expect(mocks.nodeStakeStore.detail.commitmentQuantity).toBe(123)
    expect(mocks.nodeAuthStore.currentPeer.initPos).toBe(456)
    expect(mocks.nodeAuthStore.authorizationInfo.locked).toBe('789')
    expect(mocks.nodeAuthStore.authorizationInfo.claimable).toBe('321')
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    expect(mocks.polling.startPolling).toHaveBeenCalledWith({ immediate: false })
  })

  it('keeps the stake status hidden when the refresh fails', async () => {
    mocks.nodeStakeService.refreshNodeStakeManagementDetails.mockResolvedValue({
      ok: false,
      errorKey: 'common.networkErr',
    })

    const page = useNodeStakeInfoPanel()
    expect(page.stakeStatusLoaded.value).toBe(false)

    await page.initializeStakeInfo()

    expect(page.stakeStatusLoaded.value).toBe(false)
  })
})
