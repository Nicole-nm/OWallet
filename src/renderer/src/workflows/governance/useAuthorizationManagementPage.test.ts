import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    go: vi.fn(),
  },
  polling: {
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
  },
  nodeAuthStore: {
    currentNode: { publicKey: 'pk-1' },
    splitFee: { address: '', amount: 0 },
    authorizationInfo: {} as Record<string, unknown>,
    peerAttributes: {} as Record<string, unknown>,
    peerUnboundOng: 0,
    setAuthorizationInfo: vi.fn(),
    setSplitFee: vi.fn(),
    setPeerAttributes: vi.fn(),
    setPeerUnboundOng: vi.fn(),
  },
  nodeStakeStore: {
    stakeWallet: { address: 'AQ123' },
  },
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  authorizationService: {
    refreshAuthorizationOverview: vi.fn(),
  },
  managementService: {
    canOpenNewAuthorization: vi.fn(),
    createAuthorizationClaimableOntRedeemTransaction: vi.fn(),
    createAuthorizationRewardsRedeemTransaction: vi.fn(),
    createAuthorizationUnboundOngRedeemTransaction: vi.fn(),
    createCancelAuthorizationTransaction: vi.fn(),
    validateCancelAuthorizationAmount: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: () => {},
    onBeforeUnmount: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../shared/composables/usePollingTask', () => ({
  usePollingTask: () => mocks.polling,
}))

vi.mock('../../stores/modules/NodeAuthorization', () => ({
  useNodeAuthorizationStore: () => mocks.nodeAuthStore,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../modules/governance/application/authorizationQueryApplicationService', () => ({
  refreshAuthorizationOverview: (...args: unknown[]) =>
    mocks.authorizationService.refreshAuthorizationOverview(...args),
}))

vi.mock('../../modules/governance/application/authorizationManagementApplicationService', () => ({
  canOpenNewAuthorization: (...args: unknown[]) =>
    mocks.managementService.canOpenNewAuthorization(...args),
  createAuthorizationClaimableOntRedeemTransaction: (...args: unknown[]) =>
    mocks.managementService.createAuthorizationClaimableOntRedeemTransaction(...args),
  createAuthorizationRewardsRedeemTransaction: (...args: unknown[]) =>
    mocks.managementService.createAuthorizationRewardsRedeemTransaction(...args),
  createAuthorizationUnboundOngRedeemTransaction: (...args: unknown[]) =>
    mocks.managementService.createAuthorizationUnboundOngRedeemTransaction(...args),
  createCancelAuthorizationTransaction: (...args: unknown[]) =>
    mocks.managementService.createCancelAuthorizationTransaction(...args),
  validateCancelAuthorizationAmount: (...args: unknown[]) =>
    mocks.managementService.validateCancelAuthorizationAmount(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
}))

import { useAuthorizationManagementPage } from './useAuthorizationManagementPage'

describe('useAuthorizationManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.managementService.canOpenNewAuthorization.mockReturnValue({ ok: true })
    mocks.authorizationService.refreshAuthorizationOverview.mockResolvedValue({
      ok: true,
      authorizationInfo: { claimable: '7' },
      splitFee: { address: 'AQ123', amount: 1 },
      peerAttributes: { maxAuthorize: 10 },
      peerUnboundOng: 3,
    })
  })

  it('hydrates authorization store state from the overview result and starts polling', async () => {
    const page = useAuthorizationManagementPage()

    await expect(page.initializeAuthorizationManagementPage()).resolves.toEqual(undefined)

    expect(mocks.authorizationService.refreshAuthorizationOverview).toHaveBeenCalledWith({
      address: 'AQ123',
      pk: 'pk-1',
    })
    expect(mocks.nodeAuthStore.setAuthorizationInfo).toHaveBeenCalledWith({
      authorizationInfo: { claimable: '7' },
    })
    expect(mocks.nodeAuthStore.setSplitFee).toHaveBeenCalledWith({
      splitFee: { address: 'AQ123', amount: 1 },
    })
    expect(mocks.nodeAuthStore.setPeerAttributes).toHaveBeenCalledWith({
      peerAttributes: { maxAuthorize: 10 },
    })
    expect(mocks.nodeAuthStore.setPeerUnboundOng).toHaveBeenCalledWith({
      peerUnboundOng: 3,
    })
    expect(mocks.polling.startPolling).toHaveBeenCalledWith({ immediate: false })
  })

  it('shows a loading modal while manually refreshing authorization details', async () => {
    vi.useFakeTimers()
    const page = useAuthorizationManagementPage()

    await expect(page.triggerRefresh()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        authorizationInfo: { claimable: '7' },
      })
    )

    expect(mocks.loadingStore.showLoadingModals).toHaveBeenCalled()
    expect(mocks.loadingStore.hideLoadingModals).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('routes to the new stake authorization page when the action is available', () => {
    const page = useAuthorizationManagementPage()

    expect(page.newStakeAuthorization()).toEqual({ ok: true })

    expect(mocks.router.push).toHaveBeenCalledWith({
      name: 'NewAuthorization',
    })
  })
})
