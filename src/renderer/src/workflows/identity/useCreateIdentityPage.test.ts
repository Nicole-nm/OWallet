import { ref } from 'vue'
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
  useLedgerStatusMonitor: () => ({
    ledgerStatus: ref('connected'),
    ledgerPk: ref('ledger-pk'),
    ledgerWallet: ref({ address: 'ALedger' }),
  }),
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
  })

  it('loads payer wallet options in the workflow on page entry', async () => {
    const page = useCreateIdentityPage()
    await Promise.resolve()

    expect(page.payerWalletOptions.value).toEqual([{ address: 'AQ123', label: 'Alice Wallet' }])
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
})
