import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletSigner } from '../../shared/lib/types'

const mocks = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
  showAppError: vi.fn(),
  showLoadingModals: vi.fn(),
  hideLoadingModals: vi.fn(),
  pauseMonitoring: vi.fn(),
  startMonitoring: vi.fn(),
  ledgerStatus: { value: '' },
  ledgerWallet: { value: { address: '' } as { address: string } },
  signGovernancePayload: vi.fn(),
  submitGovernanceSignedTransaction: vi.fn(),
  fromWalletSigner: vi.fn(),
  isSdkTransactionLike: vi.fn(),
  handleTransactionFeedback: vi.fn(),
  notifyGovernanceSigningFailure: vi.fn(),
  classifyError: vi.fn(),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.notifyError(...args),
  notifyWarning: (...args: unknown[]) => mocks.notifyWarning(...args),
  showAppError: (...args: unknown[]) => mocks.showAppError(...args),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => ({
    showLoadingModals: mocks.showLoadingModals,
    hideLoadingModals: mocks.hideLoadingModals,
  }),
}))

vi.mock('../../modules/wallet/composables/useLedgerStatusMonitor', () => ({
  useLedgerStatusMonitor: () => ({
    ledgerStatus: mocks.ledgerStatus,
    ledgerWallet: mocks.ledgerWallet,
    pauseMonitoring: mocks.pauseMonitoring,
    startMonitoring: mocks.startMonitoring,
  }),
}))

vi.mock('../../modules/governance/application/common/governanceSigningApplicationService', () => ({
  signGovernancePayload: (...args: unknown[]) => mocks.signGovernancePayload(...args),
  submitGovernanceSignedTransaction: (...args: unknown[]) =>
    mocks.submitGovernanceSignedTransaction(...args),
}))

vi.mock('../../modules/wallet/application/adapter/WalletAdapterFactory', () => ({
  WalletAdapterFactory: {
    fromWalletSigner: (...args: unknown[]) => mocks.fromWalletSigner(...args),
  },
}))

vi.mock('../../modules/governance/application/common/governanceSignablePayload', () => ({
  isSdkTransactionLike: (...args: unknown[]) => mocks.isSdkTransactionLike(...args),
}))

vi.mock('../../shared/lib/transactionFeedback', () => ({
  handleTransactionFeedback: (...args: unknown[]) => mocks.handleTransactionFeedback(...args),
}))

vi.mock('./governanceSigningFeedback', () => ({
  notifyGovernanceSigningFailure: (...args: unknown[]) =>
    mocks.notifyGovernanceSigningFailure(...args),
}))

vi.mock('../../shared/lib/errors', () => ({
  classifyError: (...args: unknown[]) => mocks.classifyError(...args),
}))

import { useGovernanceSignAndSend } from './useGovernanceSignAndSend'

const commonWallet = { address: 'AQ-stake', key: 'encrypted' } as unknown as WalletSigner
const ledgerWallet = { address: 'AQ-ledger' } as unknown as WalletSigner

describe('useGovernanceSignAndSend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ledgerStatus.value = ''
    mocks.ledgerWallet.value = { address: '' }
    mocks.fromWalletSigner.mockReturnValue({ capabilities: {} })
    mocks.signGovernancePayload.mockResolvedValue({ ok: true, signedPayload: { signed: true } })
    mocks.submitGovernanceSignedTransaction.mockResolvedValue({ ok: true })
    mocks.isSdkTransactionLike.mockReturnValue(true)
    mocks.handleTransactionFeedback.mockReturnValue({ ok: true })
  })

  it('signs and broadcasts a common-wallet transaction and clears the password', async () => {
    const signer = useGovernanceSignAndSend({ wallet: () => commonWallet })
    signer.walletPassword.value = 'secret'

    await expect(signer.signAndSend('serialized-tx')).resolves.toEqual({ ok: true })

    expect(mocks.signGovernancePayload).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'secret', payload: 'serialized-tx' })
    )
    expect(mocks.submitGovernanceSignedTransaction).toHaveBeenCalled()
    expect(signer.walletPassword.value).toBe('')
  })

  it('blocks signing when the common-wallet password is empty', async () => {
    const signer = useGovernanceSignAndSend({ wallet: () => commonWallet })

    expect(signer.ensureSignerReady()).toBe(false)
    await expect(signer.signAndSend('serialized-tx')).resolves.toEqual({ ok: false })

    expect(mocks.notifyError).toHaveBeenCalledWith('nodeStake.passwordEmpty')
    expect(mocks.signGovernancePayload).not.toHaveBeenCalled()
  })

  it('warns when a Ledger wallet is not connected', async () => {
    const signer = useGovernanceSignAndSend({ wallet: () => ledgerWallet })

    expect(signer.usesCommonWallet.value).toBe(false)
    await expect(signer.signAndSend('serialized-tx')).resolves.toEqual({ ok: false })

    expect(mocks.notifyWarning).toHaveBeenCalledWith('ledgerWallet.connectApp')
    expect(mocks.signGovernancePayload).not.toHaveBeenCalled()
  })

  it('reports a cancelled signature without surfacing an error', async () => {
    mocks.signGovernancePayload.mockResolvedValueOnce({ ok: false, cancelled: true })
    const signer = useGovernanceSignAndSend({ wallet: () => commonWallet })
    signer.walletPassword.value = 'secret'

    await expect(signer.signAndSend('serialized-tx')).resolves.toEqual({
      ok: false,
      cancelled: true,
    })

    expect(mocks.notifyGovernanceSigningFailure).not.toHaveBeenCalled()
    expect(signer.walletPassword.value).toBe('')
  })

  it('surfaces a network failure when broadcasting fails', async () => {
    mocks.submitGovernanceSignedTransaction.mockResolvedValueOnce({
      ok: false,
      category: 'network',
      errorKey: 'common.networkErr',
    })
    const signer = useGovernanceSignAndSend({ wallet: () => commonWallet })
    signer.walletPassword.value = 'secret'

    await expect(signer.signAndSend('serialized-tx')).resolves.toEqual({ ok: false })
    expect(mocks.notifyError).toHaveBeenCalledWith('common.networkErr')
  })
})
