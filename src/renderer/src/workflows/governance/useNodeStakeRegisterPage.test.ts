import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    go: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
  },
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  settingStore: {
    network: 'testnet',
  },
  nodeStakeStore: {
    stakeIdentity: { ontid: 'did:ont:ABC' },
    stakeWallet: { key: 'key-1', address: 'AQ123' },
    detail: { ontid: 'did:ont:ABC', stakeWalletAddress: 'AQ123', publicKey: 'pk-1' },
    setStakeDetail: vi.fn(),
  },
  stakeService: {
    createNodeStakeRegistrationDraft: vi.fn(),
    loadNodeStakeRegistrationDetail: vi.fn(),
    signNodeStakeRegistrationOntid: vi.fn(),
    submitNodeStakeRegistration: vi.fn(),
  },
  ledgerMonitor: {
    ledgerStatus: { value: '' },
    ledgerWallet: { value: null },
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: (fn: (...args: unknown[]) => unknown) => fn(),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock('../../modules/wallet/composables/useLedgerStatusMonitor', () => ({
  useLedgerStatusMonitor: () => mocks.ledgerMonitor,
}))

vi.mock('../../modules/governance/application/nodeStakeOnboardingApplicationService', () => ({
  createNodeStakeRegistrationDraft: (...args: unknown[]) =>
    mocks.stakeService.createNodeStakeRegistrationDraft(...args),
  loadNodeStakeRegistrationDetail: (...args: unknown[]) =>
    mocks.stakeService.loadNodeStakeRegistrationDetail(...args),
  signNodeStakeRegistrationOntid: (...args: unknown[]) =>
    mocks.stakeService.signNodeStakeRegistrationOntid(...args),
  submitNodeStakeRegistration: (...args: unknown[]) =>
    mocks.stakeService.submitNodeStakeRegistration(...args),
}))

import { useNodeStakeRegisterPage } from './useNodeStakeRegisterPage'

describe('useNodeStakeRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.stakeService.loadNodeStakeRegistrationDetail.mockResolvedValue({
      ok: true,
      detail: { ontid: 'did:ont:ABC', stakeWalletAddress: 'AQ123', publicKey: 'pk-1' },
    })
  })

  it('loads stake detail on mount', async () => {
    useNodeStakeRegisterPage()
    await vi.waitFor(() => {
      expect(mocks.stakeService.loadNodeStakeRegistrationDetail).toHaveBeenCalledWith({
        network: 'testnet',
        ontid: 'did:ont:ABC',
      })
    })
  })

  it('notifies error when detail load fails', async () => {
    mocks.stakeService.loadNodeStakeRegistrationDetail.mockResolvedValue({
      ok: false,
      errorKey: 'nodeStake.loadFailed',
    })
    useNodeStakeRegisterPage()
    await vi.waitFor(() => {
      expect(mocks.feedback.notifyError).toHaveBeenCalledWith('nodeStake.loadFailed')
    })
  })

  it('creates draft and opens ontid modal on handleStake', async () => {
    mocks.stakeService.createNodeStakeRegistrationDraft.mockResolvedValue({
      ok: true,
      tx: { txData: 'fake-tx' },
    })
    const page = useNodeStakeRegisterPage()
    page.stakeQuantity.value = '500'

    await page.handleStake()

    expect(mocks.stakeService.createNodeStakeRegistrationDraft).toHaveBeenCalled()
    expect(page.ontidPassModal.value).toBe(true)
  })

  it('notifies error when draft creation fails', async () => {
    mocks.stakeService.createNodeStakeRegistrationDraft.mockResolvedValue({
      ok: false,
      errorKey: 'nodeStake.invalidAmount',
    })
    const page = useNodeStakeRegisterPage()

    await page.handleStake()

    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('nodeStake.invalidAmount')
    expect(page.ontidPassModal.value).toBe(false)
  })

  it('navigates back on handleRouteBack', () => {
    const page = useNodeStakeRegisterPage()
    page.handleRouteBack()
    expect(mocks.router.go).toHaveBeenCalledWith(-1)
  })

  it('resets ontid state on cancel', async () => {
    mocks.stakeService.createNodeStakeRegistrationDraft.mockResolvedValue({
      ok: true,
      tx: { txData: 'fake-tx' },
    })
    const page = useNodeStakeRegisterPage()
    await page.handleStake()
    expect(page.ontidPassModal.value).toBe(true)

    page.handleOntidSignCancel()
    expect(page.ontidPassModal.value).toBe(false)
    expect(page.ontidPassword.value).toBe('')
  })

  it('submits wallet signing and navigates on success', async () => {
    mocks.stakeService.createNodeStakeRegistrationDraft.mockResolvedValue({
      ok: true,
      tx: { txData: 'fake-tx' },
    })
    mocks.stakeService.signNodeStakeRegistrationOntid.mockResolvedValue({ ok: true })
    mocks.stakeService.submitNodeStakeRegistration.mockResolvedValue({ ok: true })

    const page = useNodeStakeRegisterPage()

    await page.handleStake()
    page.ontidPassword.value = 'ontid-pass'
    await page.handleOntidSignOK()
    expect(page.walletPassModal.value).toBe(true)

    page.walletPassword.value = 'wallet-pass'
    await page.handleWalletSignOK()

    expect(mocks.loadingStore.showLoadingModals).toHaveBeenCalled()
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'NodeStakeInfo' })
  })

  it('shows warning for submit failure with warning level', async () => {
    mocks.stakeService.createNodeStakeRegistrationDraft.mockResolvedValue({
      ok: true,
      tx: { txData: 'fake-tx' },
    })
    mocks.stakeService.signNodeStakeRegistrationOntid.mockResolvedValue({ ok: true })
    mocks.stakeService.submitNodeStakeRegistration.mockResolvedValue({
      ok: false,
      errorKey: 'nodeStake.pendingApproval',
      level: 'warning',
      stage: 'confirm',
    })

    const page = useNodeStakeRegisterPage()
    await page.handleStake()
    page.ontidPassword.value = 'ontid-pass'
    await page.handleOntidSignOK()
    page.walletPassword.value = 'wallet-pass'
    await page.handleWalletSignOK()

    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('nodeStake.pendingApproval')
  })
})
