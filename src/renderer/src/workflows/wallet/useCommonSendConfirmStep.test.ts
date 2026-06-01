import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  currentWalletStore: {
    wallet: { label: 'TestWallet', key: 'key-1', address: 'AQ123' },
    transfer: { to: 'AQ456', amount: '10', asset: 'ONT' },
  },
  feedback: {
    notifyWarning: vi.fn(),
  },
  ledgerMonitor: {
    ledgerConnectorStore: { setLedgerStatus: vi.fn() },
    ledgerStatus: { value: '' },
    ledgerPk: { value: '' },
    pauseMonitoring: vi.fn(),
    startMonitoring: vi.fn(),
  },
  transactionFeedback: {
    handleTransactionFeedback: vi.fn((result: any) => result),
  },
  transferService: {
    submitCommonTransfer: vi.fn(),
  },
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyWarning: (...args: any[]) => mocks.feedback.notifyWarning(...args),
  notifyError: vi.fn(),
}))

vi.mock('../../modules/wallet/application/adapter/WalletAdapterFactory', () => ({
  WalletAdapterFactory: {
    fromWalletSigner: vi.fn(() => ({
      identity: { type: 'common', address: 'AQ123', publicKey: 'pk', label: 'L' },
      capabilities: {
        requiresPassword: true,
        requiresHardwareDevice: false,
        singleSignature: true,
        multiSignature: false,
        canSignMessage: true,
      },
      signTransaction: vi.fn(),
      signMessage: vi.fn(),
      addSignature: vi.fn(),
    })),
  },
}))

vi.mock('../../modules/wallet/composables/useLedgerStatusMonitor', () => ({
  useLedgerStatusMonitor: () => mocks.ledgerMonitor,
}))

vi.mock('../../shared/lib/transactionFeedback', () => ({
  handleTransactionFeedback: mocks.transactionFeedback.handleTransactionFeedback,
}))

vi.mock('../../modules/wallet/application/transfer/commonTransferApplicationService', () => ({
  submitCommonTransfer: mocks.transferService.submitCommonTransfer,
}))

import { useCommonSendConfirmStep } from './useCommonSendConfirmStep'

describe('useCommonSendConfirmStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentWalletStore.wallet = { label: 'TestWallet', key: 'key-1', address: 'AQ123' }
    mocks.ledgerMonitor.ledgerPk = { value: '' }
    mocks.ledgerMonitor.pauseMonitoring.mockResolvedValue(undefined)
  })

  it('warns when password missing for common wallet submit', async () => {
    const { submit, checked, password } = useCommonSendConfirmStep()
    checked.value = true
    password.value = ''

    const result = await submit()

    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.confirmPwdTips')
    expect(result).toEqual({ ok: false, errorKey: 'common.confirmPwdTips' })
  })

  it('warns when not checked for common wallet', async () => {
    const { submit, checked, password } = useCommonSendConfirmStep()
    checked.value = false
    password.value = 'test123'

    const result = await submit()

    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.confirmPwdTips')
    expect(result).toEqual({ ok: false, errorKey: 'common.confirmPwdTips' })
  })

  it('submits successfully for common wallet', async () => {
    mocks.transferService.submitCommonTransfer.mockResolvedValue({ ok: true })
    const { submit, checked, password } = useCommonSendConfirmStep()
    checked.value = true
    password.value = 'myPassword'

    const result = await submit()

    expect(mocks.loadingStore.showLoadingModals).toHaveBeenCalled()
    expect(mocks.transferService.submitCommonTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        address: 'AQ123',
        transfer: mocks.currentWalletStore.transfer,
        password: 'myPassword',
      })
    )
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })

  it('handles transfer failure', async () => {
    const failResult = { ok: false, errorKey: 'common.transferFailed' }
    mocks.transferService.submitCommonTransfer.mockResolvedValue(failResult)
    mocks.transactionFeedback.handleTransactionFeedback.mockReturnValue(failResult)
    const { submit, checked, password } = useCommonSendConfirmStep()
    checked.value = true
    password.value = 'myPassword'

    const result = await submit()

    expect(mocks.transactionFeedback.handleTransactionFeedback).toHaveBeenCalledWith(failResult, {
      prependErrorPrefix: false,
    })
    expect(result).toEqual(failResult)
  })

  it('warns ledger wallet when not connected', async () => {
    mocks.currentWalletStore.wallet = { label: 'Ledger', key: '', address: 'AQ999' }
    mocks.ledgerMonitor.ledgerPk = { value: '' }
    const { submit, checked } = useCommonSendConfirmStep()
    checked.value = true

    const result = await submit()

    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('ledgerWallet.connectApp')
    expect(result).toEqual({ ok: false, errorKey: 'ledgerWallet.connectApp' })
  })

  it('pauses ledger polling while a ledger transfer is submitted', async () => {
    mocks.currentWalletStore.wallet = { label: 'Ledger', key: '', address: 'AQ999' }
    mocks.ledgerMonitor.ledgerPk = { value: 'ledger-pk' }
    mocks.transferService.submitCommonTransfer.mockResolvedValue({ ok: true })
    const { submit, checked } = useCommonSendConfirmStep()
    checked.value = true

    await submit()

    expect(mocks.ledgerMonitor.pauseMonitoring).toHaveBeenCalledTimes(1)
    expect(mocks.transferService.submitCommonTransfer).toHaveBeenCalledTimes(1)
    expect(mocks.ledgerMonitor.startMonitoring).toHaveBeenCalledTimes(1)
  })

  it('toggles checked on onChange', () => {
    const { checked, onChange } = useCommonSendConfirmStep()
    expect(checked.value).toBe(false)
    onChange()
    expect(checked.value).toBe(true)
    onChange()
    expect(checked.value).toBe(false)
  })
})
