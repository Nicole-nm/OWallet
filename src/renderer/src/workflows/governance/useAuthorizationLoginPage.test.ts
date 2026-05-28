import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    go: vi.fn(),
  },
  nodeAuthStore: {
    currentNode: { publicKey: 'pk-1', name: 'Node A' },
    stakeAuthorizationWallet: '',
    setCurrentNode: vi.fn(),
    setStakeAuthorizationWallet: vi.fn(),
  },
  nodeStakeStore: {
    setStakeWallet: vi.fn(),
    setNodePublicKey: vi.fn(),
    setNodeStatus: vi.fn(),
  },
  nodeSessionStore: {
    selectNodeContext: vi.fn(),
    setActiveManagementTab: vi.fn(),
  },
  selection: {
    ensureWalletsLoaded: vi.fn(),
    restoreSelectedWallet: vi.fn(),
    resolveSelectedWallet: vi.fn(),
    cleanupSelection: vi.fn(),
  },
  authorizationContextService: {
    openAuthorizationManagement: vi.fn(),
  },
}))

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

vi.mock('../../modules/governance/application/authorizationContextService', () => ({
  openAuthorizationManagement: (...args: unknown[]) =>
    mocks.authorizationContextService.openAuthorizationManagement(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: vi.fn(),
}))

import { ROUTE_NAMES } from '../../router/routes'
import { useAuthorizationLoginPage } from './useAuthorizationLoginPage'

describe('useAuthorizationLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selection.ensureWalletsLoaded.mockResolvedValue([])
    mocks.selection.resolveSelectedWallet.mockReturnValue({ address: 'AQ123' })
    mocks.authorizationContextService.openAuthorizationManagement.mockReturnValue({
      ok: true,
      route: { name: ROUTE_NAMES.AUTHORIZATION_MGMT },
      authorizationContext: {
        currentNode: { publicKey: 'pk-1', name: 'Node A' },
        stakeWallet: { address: 'AQ123' },
      },
      managementContext: {
        stakeWallet: { address: 'AQ123' },
        nodePublicKey: 'pk-1',
        status: '',
        activeTab: 2,
      },
    })
  })

  it('applies authorization and management context before navigating', () => {
    const page = useAuthorizationLoginPage()

    expect(mocks.selection.ensureWalletsLoaded).toHaveBeenCalledTimes(1)
    expect(page.submitAuthorizationLogin()).toEqual({ ok: true })
    expect(mocks.nodeAuthStore.setCurrentNode).toHaveBeenCalledWith({
      currentNode: { publicKey: 'pk-1', name: 'Node A' },
    })
    expect(mocks.nodeAuthStore.setStakeAuthorizationWallet).toHaveBeenCalledWith({
      stakeWallet: { address: 'AQ123' },
    })
    expect(mocks.nodeSessionStore.selectNodeContext).toHaveBeenCalledWith({
      stakeWallet: { address: 'AQ123' },
      nodePublicKey: 'pk-1',
      status: '',
    })
    expect(mocks.nodeSessionStore.setActiveManagementTab).toHaveBeenCalledWith(2)
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'AuthorizationMgmt' })
  })
})
