import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createNodeApplyTransactionDraft: vi.fn(),
  createPendingNodeApplyInfo: vi.fn(),
  validateNodeApplyRegistrationInput: vi.fn(),
  openNodeManagement: vi.fn(),
  applyManagementContext: vi.fn(),
  notifyError: vi.fn(),
  notifyFailure: vi.fn(),
}))

vi.mock('../../modules/governance/application/nodeStake/nodeApplyApplicationService', () => ({
  createNodeApplyTransactionDraft: (...args: unknown[]) =>
    mocks.createNodeApplyTransactionDraft(...args),
  createPendingNodeApplyInfo: (...args: unknown[]) => mocks.createPendingNodeApplyInfo(...args),
  validateNodeApplyRegistrationInput: (...args: unknown[]) =>
    mocks.validateNodeApplyRegistrationInput(...args),
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
    mocks.validateNodeApplyRegistrationInput.mockResolvedValue({ ok: true })
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

    expect(mocks.validateNodeApplyRegistrationInput).toHaveBeenCalledWith({
      network: 'testnet',
      stakeWalletAddress: 'AQ-stake',
      operationWalletPublicKey: 'node-pk',
    })
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

  it('confirm exits early when the application service fails', async () => {
    mocks.createNodeApplyTransactionDraft.mockResolvedValueOnce({ ok: false, errorKey: 'oops' })
    mocks.notifyFailure.mockReturnValueOnce(true)

    const { subject } = createSubject()
    await subject.confirm()

    expect(subject.tx.value).toBeNull()
    expect(subject.signVisible.value).toBe(false)
  })

  it('confirm stops before creating a draft when the operation public key is registered', async () => {
    mocks.validateNodeApplyRegistrationInput.mockResolvedValueOnce({
      ok: false,
      errorKey: 'nodeApply.publicKeyAlreadyRegistered',
    })

    const { subject } = createSubject()
    await expect(subject.confirm()).resolves.toEqual({
      ok: false,
      errorKey: 'nodeApply.publicKeyAlreadyRegistered',
    })

    expect(mocks.notifyFailure).toHaveBeenCalledWith(
      { ok: false, errorKey: 'nodeApply.publicKeyAlreadyRegistered' },
      'common.networkErr'
    )
    expect(mocks.createNodeApplyTransactionDraft).not.toHaveBeenCalled()
    expect(subject.tx.value).toBeNull()
    expect(subject.signVisible.value).toBe(false)
  })

  it('persistPendingNodeInfo records the failure but leaves the persisted flag false', async () => {
    mocks.createPendingNodeApplyInfo.mockResolvedValueOnce({ ok: false, errorKey: 'down' })
    mocks.notifyFailure.mockReturnValueOnce(true)

    const { subject } = createSubject()
    await subject.handleTxSent()

    expect(subject.pendingNodeInfoPersisted.value).toBe(false)
  })

  it('onComplete notifies an error when no node public key is available', async () => {
    mocks.createPendingNodeApplyInfo.mockResolvedValue({ ok: true, nodePublicKey: '' })

    const { subject } = createSubject()
    subject.pendingNodePublicKey.value = ''
    const router = { push: vi.fn() }
    const subjectWithoutPk = useNodeApplyTransaction({
      router: router as never,
      settingStore: { network: 'testnet' } as never,
      nodeStakeStore: {} as never,
      nodeSessionStore: {} as never,
      stakeWallet: ref({ address: 'AQ-stake' } as NodeApplyWallet),
      stakeAmount: ref('1'),
      getNodePublicKey: () => '',
    })

    await subjectWithoutPk.onComplete()
    expect(mocks.notifyError).toHaveBeenCalledWith('common.networkErr')
  })

  it('onComplete persists pending info when the prior persistence failed', async () => {
    mocks.createPendingNodeApplyInfo.mockResolvedValueOnce({ ok: false })
    mocks.createPendingNodeApplyInfo.mockResolvedValueOnce({ ok: true, nodePublicKey: 'node-pk' })
    mocks.notifyFailure.mockReturnValue(false)

    const { subject } = createSubject()
    await subject.handleTxSent()
    expect(subject.pendingNodeInfoPersisted.value).toBe(false)

    await subject.onComplete()
    expect(mocks.createPendingNodeApplyInfo).toHaveBeenCalledTimes(2)
  })

  it('onLater routes to the my-node page', () => {
    const { subject, router } = createSubject()
    subject.onLater()
    expect(router.push).toHaveBeenCalledWith({ name: 'MyNode' })
  })
})
