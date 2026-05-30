import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  nodeAuthStore: {
    currentPeer: {
      initPos: 1,
      initPosStr: '0',
      totalPosStr: '0',
    },
    peerAttributes: {
      maxAuthorize: 0,
      maxAuthorizeStr: '0',
    },
    splitFee: { amount: '0' },
    posLimit: 1,
    peerUnboundOng: 0,
    setCurrentPeer: vi.fn(),
    setPeerAttributes: vi.fn(),
    setSplitFee: vi.fn(),
    setPosLimit: vi.fn(),
    setPeerUnboundOng: vi.fn(),
  },
  nodeStakeStore: {
    stakeWallet: { address: 'AQ123' },
    detail: {},
  },
  polling: vi.fn(),
  nodeStakeService: {
    createChangeStakeAuthorizationTransaction: vi.fn(),
    createChangeStakeCostTransaction: vi.fn(),
    createStakeRewardsRedeemTransaction: vi.fn(),
    createStakeUnboundOngRedeemTransaction: vi.fn(),
    refreshNodeStakeAuthorizationDetails: vi.fn(),
    validateStakeAuthorizationUnit: vi.fn(),
  },
}))

vi.mock('../../shared/composables/usePollingTask', () => ({
  usePollingTask: mocks.polling,
}))

vi.mock('../../stores/modules/NodeAuthorization', () => ({
  useNodeAuthorizationStore: () => mocks.nodeAuthStore,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock(
  '../../modules/governance/application/nodeStake/nodeStakeManagementApplicationService',
  () => ({
    createChangeStakeAuthorizationTransaction: (...args: unknown[]) =>
      mocks.nodeStakeService.createChangeStakeAuthorizationTransaction(...args),
    createChangeStakeCostTransaction: (...args: unknown[]) =>
      mocks.nodeStakeService.createChangeStakeCostTransaction(...args),
    createStakeRewardsRedeemTransaction: (...args: unknown[]) =>
      mocks.nodeStakeService.createStakeRewardsRedeemTransaction(...args),
    createStakeUnboundOngRedeemTransaction: (...args: unknown[]) =>
      mocks.nodeStakeService.createStakeUnboundOngRedeemTransaction(...args),
    refreshNodeStakeAuthorizationDetails: (...args: unknown[]) =>
      mocks.nodeStakeService.refreshNodeStakeAuthorizationDetails(...args),
    validateStakeAuthorizationUnit: (...args: unknown[]) =>
      mocks.nodeStakeService.validateStakeAuthorizationUnit(...args),
  })
)

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: vi.fn(() => false),
}))

import { useNodeStakeAuthorizationPanel } from './useNodeStakeAuthorizationPanel'

describe('useNodeStakeAuthorizationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.nodeStakeService.refreshNodeStakeAuthorizationDetails.mockResolvedValue({ ok: true })
  })

  it('keeps the allowed stake amount when authentication is canceled', () => {
    const panel = useNodeStakeAuthorizationPanel()

    panel.unit.value = 1200
    panel.tx.value = 'pending-tx'
    panel.signVisible.value = true

    panel.handleCancel()

    expect(panel.signVisible.value).toBe(false)
    expect(panel.tx.value).toBe('')
    expect(panel.unit.value).toBe(1200)
  })

  it('clears the allowed stake amount after the transaction is sent', () => {
    const panel = useNodeStakeAuthorizationPanel()

    panel.unit.value = 1200
    panel.tx.value = 'pending-tx'
    panel.signVisible.value = true

    panel.handleTxSent()

    expect(panel.signVisible.value).toBe(false)
    expect(panel.tx.value).toBe('')
    expect(panel.unit.value).toBe(0)
    expect(mocks.nodeStakeService.refreshNodeStakeAuthorizationDetails).toHaveBeenCalledWith({
      stakeDetail: {},
      stakeWalletAddress: 'AQ123',
    })
  })
})
