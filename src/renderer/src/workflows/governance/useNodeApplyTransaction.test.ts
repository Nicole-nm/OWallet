import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createNodeApplyTransactionDraft: vi.fn(),
  createPendingNodeApplyInfo: vi.fn(),
  openNodeManagement: vi.fn(),
  applyManagementContext: vi.fn(),
  notifyError: vi.fn(),
  notifyFailure: vi.fn(),
}))

vi.mock('../../modules/governance/application/nodeStake/nodeApplyApplicationService', () => ({
  createNodeApplyTransactionDraft: (...args: unknown[]) =>
    mocks.createNodeApplyTransactionDraft(...args),
  createPendingNodeApplyInfo: (...args: unknown[]) => mocks.createPendingNodeApplyInfo(...args),
}))

vi.mock('../../modules/governance/application/nodeStake/managementContextService', () => ({
  openNodeManagement: (...args: unknown[]) => mocks.openNodeManagement(...args),
}))

vi.mock('../support/governanceContextStoreSync', () => ({
  applyManagementContext: (...args: unknown[]) => mocks.applyManagementContext(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.notifyError(...args),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: (...args: unknown[]) => mocks.notifyFailure(...args),
}))

import { useNodeApplyTransaction } from './useNodeApplyTransaction'
import type { NodeApplyWallet } from './useNodeApplyWalletSelection'

function createLocalTransactionFixture() {
  return {
    serializeUnsignedData: vi.fn(() => 'unsigned'),
    serialize: vi.fn(() => 'signed'),
    getHash: vi.fn(() => 'tx-hash'),
  }
}

function createSubject() {
  const router = { push: vi.fn() }
  const settingStore = { network: 'testnet' }
  const nodeStakeStore = { name: 'nodeStakeStore' }
  const nodeSessionStore = { name: 'nodeSessionStore' }
  const stakeWallet = ref<NodeApplyWallet | null>({ address: 'AQ-stake' } as NodeApplyWallet)
  const stakeAmount = ref('10000')
  const subject = useNodeApplyTransaction({
    router: router as never,
    settingStore: settingStore as never,
    nodeStakeStore: nodeStakeStore as never,
    nodeSessionStore: nodeSessionStore as never,
    stakeWallet,
    stakeAmount,
    getNodePublicKey: () => 'node-pk',
  })

  return { subject, router, settingStore, nodeStakeStore, nodeSessionStore, stakeWallet }
}

describe('useNodeApplyTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.notifyFailure.mockReturnValue(false)
    mocks.createNodeApplyTransactionDraft.mockResolvedValue({
      ok: true,
      tx: createLocalTransactionFixture(),
    })
    mocks.createPendingNodeApplyInfo.mockResolvedValue({
      ok: true,
      nodePublicKey: 'node-pk',
    })
    mocks.openNodeManagement.mockReturnValue({
      route: { name: 'NodeStakeManagement' },
      context: { activeTab: 3, nodePublicKey: 'node-pk' },
    })
  })

  it('creates a transaction draft and opens the signing modal', async () => {
    const { subject } = createSubject()

    await expect(subject.confirm()).resolves.toMatchObject({ ok: true })

    expect(mocks.createNodeApplyTransactionDraft).toHaveBeenCalledWith({
      stakeWalletAddress: 'AQ-stake',
      operationWalletPublicKey: 'node-pk',
      stakeAmount: '10000',
    })
    expect(subject.tx.value).not.toBeNull()
    expect(subject.signVisible.value).toBe(true)

    subject.handleTxCancel()
    expect(subject.tx.value).toBeNull()
    expect(subject.signVisible.value).toBe(false)
  })

  it('persists pending node info after the transaction is sent', async () => {
    const { subject } = createSubject()

    await subject.handleTxSent()

    expect(subject.registerSucceed.value).toBe(true)
    expect(mocks.createPendingNodeApplyInfo).toHaveBeenCalledWith({
      network: 'testnet',
      stakeWalletAddress: 'AQ-stake',
      nodePublicKey: 'node-pk',
    })
    expect(subject.pendingNodeInfoPersisted.value).toBe(true)
  })

  it('opens node management with the persisted public key on completion', async () => {
    const { subject, router, nodeSessionStore, nodeStakeStore } = createSubject()

    await subject.handleTxSent()
    await subject.onComplete()

    expect(mocks.openNodeManagement).toHaveBeenCalledWith({
      context: {
        stakeWallet: expect.objectContaining({ address: 'AQ-stake' }),
        nodePublicKey: 'node-pk',
        activeTab: 3,
      },
    })
    expect(mocks.applyManagementContext).toHaveBeenCalledWith(nodeSessionStore, nodeStakeStore, {
      activeTab: 3,
      nodePublicKey: 'node-pk',
    })
    expect(router.push).toHaveBeenCalledWith({ name: 'NodeStakeManagement' })
  })
})
