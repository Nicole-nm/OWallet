import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    go: vi.fn(),
  },
  nodeStakeStore: {
    setStakeWallet: vi.fn(),
    setNodePublicKey: vi.fn(),
    setNodeStatus: vi.fn(),
    stakeWallet: { address: 'AQ123' },
    nodePublicKey: 'pk-1',
    nodeStatus: 8,
  },
  nodeSessionStore: {
    activeManagementTab: 1,
    selectNodeContext: vi.fn(),
    setActiveManagementTab: vi.fn(),
  },
  managementContextService: {
    syncManagementContextFromSession: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: (callback: (...args: unknown[]) => unknown) => callback(),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock('../../modules/governance/store/nodeSessionStore', () => ({
  useNodeSessionStore: () => mocks.nodeSessionStore,
}))

vi.mock('../../modules/governance/application/managementContextService', () => ({
  syncManagementContextFromSession: (...args: unknown[]) =>
    mocks.managementContextService.syncManagementContextFromSession(...args),
}))

import { useNodeStakeManagementPage } from './useNodeStakeManagementPage'

describe('useNodeStakeManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.managementContextService.syncManagementContextFromSession.mockReturnValue({
      ok: true,
      context: {
        stakeWallet: { address: 'AQ123' },
        nodePublicKey: 'pk-1',
        status: 8,
        activeTab: 2,
      },
    })
  })

  it('hydrates stores from the resolved management context', () => {
    const page = useNodeStakeManagementPage()

    expect(page.initializeManagementContext()).toEqual({
      stakeWallet: { address: 'AQ123' },
      nodePublicKey: 'pk-1',
      status: 8,
      activeTab: 2,
    })
    expect(mocks.nodeSessionStore.selectNodeContext).toHaveBeenCalledWith({
      stakeWallet: { address: 'AQ123' },
      nodePublicKey: 'pk-1',
      status: 8,
    })
    expect(mocks.nodeSessionStore.setActiveManagementTab).toHaveBeenCalledWith(2)
    expect(mocks.nodeStakeStore.setStakeWallet).toHaveBeenCalledWith({
      stakeWallet: { address: 'AQ123' },
    })
    expect(mocks.nodeStakeStore.setNodePublicKey).toHaveBeenCalledWith({ nodePublicKey: 'pk-1' })
    expect(mocks.nodeStakeStore.setNodeStatus).toHaveBeenCalledWith({ status: 8 })
  })
})
