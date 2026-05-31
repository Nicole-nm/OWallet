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
  feedback: {
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
    notifyFailure: vi.fn(),
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
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: (...args: unknown[]) => mocks.feedback.notifyFailure(...args),
}))

import { useNodeStakeAuthorizationPanel } from './useNodeStakeAuthorizationPanel'

describe('useNodeStakeAuthorizationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.nodeStakeService.refreshNodeStakeAuthorizationDetails.mockResolvedValue({ ok: true })
    mocks.feedback.notifyFailure.mockReturnValue(false)
    mocks.nodeStakeStore.stakeWallet = { address: 'AQ123' }
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

  it('refreshes authorization details and hydrates the store', async () => {
    mocks.nodeStakeService.refreshNodeStakeAuthorizationDetails.mockResolvedValue({
      ok: true,
      currentPeer: { initPos: 10 },
      peerAttributes: { maxAuthorize: 20 },
      splitFee: { amount: 3 },
      posLimit: 4,
      peerUnboundOng: 5,
    })
    const panel = useNodeStakeAuthorizationPanel()

    await expect(panel.refresh()).resolves.toMatchObject({ ok: true })

    expect(mocks.nodeAuthStore.setCurrentPeer).toHaveBeenCalledWith({
      peer: { initPos: 10 },
    })
    expect(mocks.nodeAuthStore.setPeerAttributes).toHaveBeenCalledWith({
      peerAttributes: { maxAuthorize: 20 },
    })
    expect(mocks.nodeAuthStore.setSplitFee).toHaveBeenCalledWith({ splitFee: { amount: 3 } })
    expect(mocks.nodeAuthStore.setPosLimit).toHaveBeenCalledWith({ posLimit: 4 })
    expect(mocks.nodeAuthStore.setPeerUnboundOng).toHaveBeenCalledWith({ peerUnboundOng: 5 })
  })

  it('rejects refresh and transaction changes when no stake wallet is selected', async () => {
    mocks.nodeStakeStore.stakeWallet = null as never
    const panel = useNodeStakeAuthorizationPanel()

    await expect(panel.refresh()).resolves.toEqual({
      ok: false,
      errorKey: 'nodeStake.selectIndividualWallet',
    })
    await panel.confirmChangeAuthorization()
    await panel.confirmChangeCost()
    await panel.redeemRewards()
    await panel.redeemPeerUnboundOng()

    expect(mocks.feedback.notifyError).toHaveBeenCalledTimes(4)
  })

  it('validates authorization changes and opens the signing dialog for valid requests', async () => {
    mocks.nodeStakeService.validateStakeAuthorizationUnit
      .mockReturnValueOnce({ ok: false, errorKey: 'nodeMgmt.invalidInput' })
      .mockReturnValueOnce({ ok: false })
      .mockReturnValueOnce({ ok: true })
    mocks.nodeStakeService.createChangeStakeAuthorizationTransaction.mockResolvedValue({
      ok: true,
      tx: 'authorize-tx',
    })
    const panel = useNodeStakeAuthorizationPanel()

    await panel.confirmChangeAuthorization()
    await panel.confirmChangeAuthorization()
    panel.unit.value = 2
    panel.unitVal.value = 3
    await panel.confirmChangeAuthorization()

    expect(mocks.feedback.notifyError).toHaveBeenNthCalledWith(1, 'nodeMgmt.invalidInput')
    expect(mocks.feedback.notifyError).toHaveBeenNthCalledWith(2, 'common.networkErr')
    expect(mocks.nodeStakeService.createChangeStakeAuthorizationTransaction).toHaveBeenCalledWith({
      stakeDetail: {},
      stakeWalletAddress: 'AQ123',
      unit: 2,
      unitVal: 3,
      currentMaxAuthorize: 0,
    })
    expect(panel.tx.value).toBe('authorize-tx')
    expect(panel.signVisible.value).toBe(true)
  })

  it('updates local validation state and reports non-input failures', () => {
    mocks.nodeStakeService.validateStakeAuthorizationUnit
      .mockReturnValueOnce({ ok: true })
      .mockReturnValueOnce({ ok: false, errorKey: 'common.networkError' })
      .mockReturnValueOnce({ ok: false, errorKey: 'nodeMgmt.invalidInput' })
    const panel = useNodeStakeAuthorizationPanel()

    panel.validateUnit()
    expect(panel.validUnit.value).toBe(true)

    panel.validateUnit()
    expect(panel.validUnit.value).toBe(false)
    expect(mocks.feedback.notifyFailure).toHaveBeenCalledWith(
      { ok: false, errorKey: 'common.networkError' },
      'common.networkErr'
    )

    panel.validateUnit()
    expect(mocks.feedback.notifyFailure).toHaveBeenCalledTimes(1)
  })

  it('changes cost proportions and resets editing state after a successful transaction', async () => {
    mocks.nodeStakeService.createChangeStakeCostTransaction.mockResolvedValue({
      ok: true,
      tx: 'change-cost-tx',
    })
    const panel = useNodeStakeAuthorizationPanel()

    panel.editProportion()
    panel.peerCost.value = 10
    panel.stakeCost.value = 20
    await panel.confirmChangeCost()

    expect(panel.showEditProportion.value).toBe(false)
    expect(panel.peerCost.value).toBe(0)
    expect(panel.stakeCost.value).toBe(0)
    expect(panel.tx.value).toBe('change-cost-tx')

    panel.editProportion()
    panel.handleCancelChangeCost()
    expect(panel.showEditProportion.value).toBe(false)
  })

  it('propagates transaction failures without replacing the signing transaction', async () => {
    mocks.nodeStakeService.validateStakeAuthorizationUnit.mockReturnValue({ ok: true })
    mocks.nodeStakeService.createChangeStakeAuthorizationTransaction.mockResolvedValue({
      ok: false,
      errorKey: 'common.networkError',
    })
    mocks.feedback.notifyFailure.mockReturnValue(true)
    const panel = useNodeStakeAuthorizationPanel()

    await panel.confirmChangeAuthorization()

    expect(panel.tx.value).toBe('')
    expect(panel.signVisible.value).toBe(false)
  })

  it('redeems stake rewards and peer ONG while reporting rejected redemption requests', async () => {
    mocks.nodeStakeService.createStakeRewardsRedeemTransaction
      .mockResolvedValueOnce({ ok: false, errorKey: 'nodeMgmt.noRewards' })
      .mockResolvedValueOnce({ ok: true, tx: 'rewards-tx' })
    mocks.nodeStakeService.createStakeUnboundOngRedeemTransaction
      .mockResolvedValueOnce({ ok: false, errorKey: 'nodeMgmt.noUnboundOng' })
      .mockResolvedValueOnce({ ok: true, tx: 'ong-tx' })
    const panel = useNodeStakeAuthorizationPanel()

    await panel.redeemRewards()
    await panel.redeemPeerUnboundOng()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('nodeMgmt.noRewards')
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('nodeMgmt.noUnboundOng')

    await panel.redeemRewards()
    expect(panel.tx.value).toBe('rewards-tx')
    await panel.redeemPeerUnboundOng()
    expect(panel.tx.value).toBe('ong-tx')
    expect(panel.signVisible.value).toBe(true)
  })
})
