import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    back: vi.fn(),
    push: vi.fn(),
  },
  walletsStore: {
    normalWallets: [],
    hardwareWallets: [],
  },
  settingStore: { network: 'testnet' },
  nodeStakeStore: {},
  nodeSessionStore: {},
  loadWalletCollectionsIntoStore: vi.fn(),
  notifyFailure: vi.fn<(result: unknown, fallbackKey?: string) => boolean>(() => false),
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../stores/modules/NodeStake', () => ({
  useNodeStakeStore: () => mocks.nodeStakeStore,
}))

vi.mock('../../modules/governance/store/nodeSessionStore', () => ({
  useNodeSessionStore: () => mocks.nodeSessionStore,
}))

vi.mock('../support/walletCollectionsStoreSync', () => ({
  loadWalletCollectionsIntoStore: (...args: unknown[]) =>
    mocks.loadWalletCollectionsIntoStore(...args),
}))

vi.mock('../../modules/governance/application/nodeStake/nodeApplyApplicationService', () => ({
  validateNodeApplyForm: vi.fn(() => ({ ok: true })),
  validateNodeApplyOperationWallet: vi.fn(async () => ({ ok: true, address: null })),
  isNodeApplyAmountValid: vi.fn(() => true),
  createNodeApplyTransactionDraft: vi.fn(async () => ({ ok: true, tx: 'tx' })),
  createPendingNodeApplyInfo: vi.fn(async () => ({ ok: true, nodePublicKey: 'pk' })),
}))

vi.mock('../../modules/governance/application/nodeStake/managementContextService', () => ({
  openNodeManagement: vi.fn(() => ({ route: { name: 'MyNode' }, context: {} })),
}))

vi.mock('../support/governanceContextStoreSync', () => ({
  applyManagementContext: vi.fn(),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: (result: unknown, fallbackKey?: string) =>
    mocks.notifyFailure(result, fallbackKey),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
}))

vi.mock('./useGovernanceSignAndSend', () => ({
  useGovernanceSignAndSend: () => ({
    walletPassword: { value: '' },
    usesCommonWallet: { value: true },
    ledgerStatus: { value: '' },
    ensureSignerReady: vi.fn(() => true),
    signAndSend: vi.fn(async () => ({ ok: true })),
  }),
}))

import { useNodeApplyPage } from './useNodeApplyPage'

describe('useNodeApplyPage facade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('keeps the page-facing contract stable while delegating to focused composables', () => {
    const page = useNodeApplyPage()
    const expectedKeys = [
      'current',
      'walletType',
      'stakeWalletValue',
      'stakeWallet',
      'operationWallet',
      'operationPk',
      'stakeAmount',
      'minStakeAmount',
      'walletPassword',
      'usesCommonWallet',
      'ledgerStatus',
      'registerSucceed',
      'validAmount',
      'ledgerList',
      'stakeWalletOptions',
      'normalWalletAndLedgerWallet',
      'back',
      'onWalletSelected',
      'next',
      'cancel',
      'onSelectOperationWallet',
      'confirm',
      'handleTxSent',
      'onComplete',
      'onLater',
      'validateAmount',
      'ontBalance',
      'ongBalance',
      'isOntSufficient',
      'isOngSufficient',
    ]

    for (const key of expectedKeys) {
      expect(page).toHaveProperty(key)
    }

    page.back()
    expect(mocks.router.back).toHaveBeenCalled()
  })
})
