import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
  },
  loading: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  application: {
    createIdentityRegistrationDraft: vi.fn(),
    loadIdentityPayerWalletOptions: vi.fn(),
    persistCreatedIdentity: vi.fn(),
    submitIdentityRegistration: vi.fn(),
  },
  ledgerMonitor: {
    useLedgerStatusMonitor: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: (callback: any) => callback(),
    onBeforeUnmount: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: any) => key,
  }),
  createI18n: () => ({
    global: {
      t: (key: any) => key,
      locale: { value: 'en' },
    },
  }),
}))

vi.mock('../../modules/identity/application/createIdentityApplicationService', () => ({
  createIdentityRegistrationDraft: (...args: any[]) =>
    mocks.application.createIdentityRegistrationDraft(...args),
  loadIdentityPayerWalletOptions: (...args: any[]) =>
    mocks.application.loadIdentityPayerWalletOptions(...args),
  persistCreatedIdentity: (...args: any[]) => mocks.application.persistCreatedIdentity(...args),
  submitIdentityRegistration: (...args: any[]) =>
    mocks.application.submitIdentityRegistration(...args),
}))

vi.mock('../../modules/wallet/composables/useLedgerStatusMonitor', () => ({
  useLedgerStatusMonitor: (...args: unknown[]) =>
    mocks.ledgerMonitor.useLedgerStatusMonitor(...args),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: any[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: any[]) => mocks.feedback.notifySuccess(...args),
  notifyWarning: (...args: any[]) => mocks.feedback.notifyWarning(...args),
}))

import { useCreateIdentityPage } from './useCreateIdentityPage'
import type { CommonWallet } from '../../shared/lib/types'

function makeWallet(): CommonWallet {
  return {
    address: 'AQ123',
    label: 'Alice Wallet',
    key: 'encrypted-key',
    salt: 'salt',
    algorithm: 'ECDSA',
    parameters: { curve: 'P-256' },
    scrypt: {},
    publicKey: 'pk',
  }
}

describe('useCreateIdentityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.application.loadIdentityPayerWalletOptions.mockResolvedValue({
      ok: true,
      options: [{ address: 'AQ123', label: 'Alice Wallet' }],
    })
    mocks.ledgerMonitor.useLedgerStatusMonitor.mockReturnValue({
      ledgerStatus: ref('connected'),
      ledgerPk: ref('ledger-pk'),
      ledgerWallet: ref({ address: 'ALedger' }),
    })
  })

  it('loads payer wallet options in the workflow on page entry', async () => {
    const page = useCreateIdentityPage()
    await Promise.resolve()

    expect(page.payerWalletOptions.value).toEqual([{ address: 'AQ123', label: 'Alice Wallet' }])
  })

  it('enables ledger status polling while the ledger payer is selected on the basic step', () => {
    const page = useCreateIdentityPage()
    expect(mocks.ledgerMonitor.useLedgerStatusMonitor).toHaveBeenCalledTimes(1)
    const monitorOptions = mocks.ledgerMonitor.useLedgerStatusMonitor.mock.calls[0]?.[0] as {
      shouldPoll: { value: boolean }
    }

    expect(monitorOptions.shouldPoll.value).toBe(false)

    page.payerWalletType.value = 'ledgerWallet'
    expect(monitorOptions.shouldPoll.value).toBe(true)

    page.currentStep.value = 1
    expect(monitorOptions.shouldPoll.value).toBe(false)
  })

  it('submits the basic step through the workflow and advances after signing', async () => {
    mocks.application.createIdentityRegistrationDraft.mockResolvedValue({
      ok: true,
      label: 'Alice Identity',
      ontid: 'did:ont:alice',
      identity: { ontid: 'did:ont:alice' },
      tx: 'tx-1',
    })
    mocks.application.submitIdentityRegistration.mockResolvedValue({ ok: true })

    const page = useCreateIdentityPage()

    page.basicLabel.value = 'Alice Identity'
    page.basicPassword.value = 'secret123'
    page.basicRePassword.value = 'secret123'
    page.handleCreateIdentityPayerSelection({
      wallet: makeWallet(),
    })
    page.payerPassword.value = 'wallet-pass'

    await page.submitCreateIdentityBasicStep()

    expect(page.currentStep.value).toBe(1)
    expect(page.createdOntid.value).toBe('did:ont:alice')
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('common.transSentSuccess')
  })

  it('persists created identities and routes back to the identity list', async () => {
    mocks.application.createIdentityRegistrationDraft.mockResolvedValue({
      ok: true,
      label: 'Alice Identity',
      ontid: 'did:ont:alice',
      identity: { ontid: 'did:ont:alice' },
      tx: 'tx-1',
    })
    mocks.application.submitIdentityRegistration.mockResolvedValue({ ok: true })
    mocks.application.persistCreatedIdentity.mockResolvedValue({ ok: true })

    const page = useCreateIdentityPage()
    page.basicLabel.value = 'Alice Identity'
    page.basicPassword.value = 'secret123'
    page.basicRePassword.value = 'secret123'
    page.handleCreateIdentityPayerSelection({
      wallet: makeWallet(),
    })
    page.payerPassword.value = 'wallet-pass'

    await page.submitCreateIdentityBasicStep()
    vi.clearAllMocks()
    mocks.application.persistCreatedIdentity.mockResolvedValue({ ok: true })

    await page.submitCreateIdentityConfirmStep()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('createIdentity.createSuccess')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Identities' })
    expect(page.currentStep.value).toBe(0)
    expect(page.createdOntid.value).toBe('')
  })

  it('clears payer options when loading wallets fails', async () => {
    mocks.application.loadIdentityPayerWalletOptions.mockResolvedValue({ ok: false })

    const page = useCreateIdentityPage()
    await Promise.resolve()

    expect(page.payerWalletOptions.value).toEqual([])
  })

  it('rejects missing payer wallets, payer passwords, and invalid identity fields', async () => {
    const page = useCreateIdentityPage()

    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('createIdentity.selectOneWallet')

    page.handleCreateIdentityPayerSelection({ wallet: makeWallet() })
    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('createIdentity.enterPassword')

    page.payerPassword.value = 'wallet-pass'
    await page.submitCreateIdentityBasicStep()
    expect(page.basicValidationErrors.value.label).toBe('validation.required')
    expect(page.basicValidationErrors.value.password).toBe('validation.required')
    expect(page.basicValidationErrors.value.rePassword).toBe('validation.required')

    page.basicLabel.value = 'Identity'
    page.basicPassword.value = 'short'
    page.basicRePassword.value = 'different'
    await page.submitCreateIdentityBasicStep()
    expect(page.basicValidationErrors.value.password).toBe('validation.minLength')
    expect(page.basicValidationErrors.value.rePassword).toBe('validation.mismatch')
  })

  it('reports warning, keyed, literal, and fallback draft failures', async () => {
    const page = useCreateIdentityPage()
    page.basicLabel.value = 'Identity'
    page.basicPassword.value = 'secret123'
    page.basicRePassword.value = 'secret123'
    page.handleCreateIdentityPayerSelection({ wallet: makeWallet() })
    page.payerPassword.value = 'wallet-pass'

    mocks.application.createIdentityRegistrationDraft
      .mockResolvedValueOnce({ ok: false, level: 'warning', errorKey: 'warn-key' })
      .mockResolvedValueOnce({ ok: false, errorKey: 'error-key' })
      .mockResolvedValueOnce({ ok: false, message: 'literal failure' })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false, cancelled: true })

    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyWarning).toHaveBeenLastCalledWith('warn-key')
    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('error-key')
    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('literal failure', {
      literal: true,
    })
    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('common.networkError')
    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenCalledTimes(3)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(5)
  })

  it('reports submission failures and missing ledger adapters', async () => {
    mocks.application.createIdentityRegistrationDraft.mockResolvedValue({
      ok: true,
      tx: 'tx-1',
    })
    mocks.application.submitIdentityRegistration.mockResolvedValue({
      ok: false,
      errorKey: 'submit-failed',
    })
    const page = useCreateIdentityPage()
    page.basicLabel.value = 'Identity'
    page.basicPassword.value = 'secret123'
    page.basicRePassword.value = 'secret123'
    page.handleCreateIdentityPayerSelection({ wallet: makeWallet() })
    page.payerPassword.value = 'wallet-pass'

    await page.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('submit-failed')

    mocks.ledgerMonitor.useLedgerStatusMonitor.mockReturnValue({
      ledgerStatus: ref('disconnected'),
      ledgerPk: ref(''),
      ledgerWallet: ref(null),
    })
    const ledgerPage = useCreateIdentityPage()
    ledgerPage.payerWalletType.value = 'ledgerWallet'
    ledgerPage.basicLabel.value = 'Identity'
    ledgerPage.basicPassword.value = 'secret123'
    ledgerPage.basicRePassword.value = 'secret123'

    await ledgerPage.submitCreateIdentityBasicStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('createIdentity.selectOneWallet')
  })

  it('handles confirmation failures and resets payer state when the type changes', async () => {
    const page = useCreateIdentityPage()

    await page.submitCreateIdentityConfirmStep()
    expect(mocks.feedback.notifyError).toHaveBeenLastCalledWith('common.savedbFailed')

    page.handleCreateIdentityPayerSelection({ wallet: makeWallet() })
    page.payerPassword.value = 'wallet-pass'
    page.payerWalletType.value = 'ledgerWallet'
    await nextTick()
    expect(page.payerWalletValue.value).toBeUndefined()
    expect(page.payerPassword.value).toBe('')

    page.cancelCreateIdentityBasicStep()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Identities' })
  })
})
