import { nextTick } from 'vue'
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
    createJsonWalletDraft: vi.fn(),
    downloadCreatedJsonWallet: vi.fn(),
    persistCreatedJsonWallet: vi.fn(),
  },
  walletsStore: {
    setWalletCollections: vi.fn(),
    setWalletCollectionsLoaded: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
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

vi.mock('../../modules/wallet/application/createJsonWalletApplicationService', () => ({
  createJsonWalletDraft: (...args: any[]) => mocks.application.createJsonWalletDraft(...args),
  downloadCreatedJsonWallet: (...args: any[]) =>
    mocks.application.downloadCreatedJsonWallet(...args),
  persistCreatedJsonWallet: (...args: any[]) => mocks.application.persistCreatedJsonWallet(...args),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: any[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: any[]) => mocks.feedback.notifySuccess(...args),
  notifyWarning: (...args: any[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

import { useCreateJsonWalletPage } from './useCreateJsonWalletPage'

describe('useCreateJsonWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.application.downloadCreatedJsonWallet.mockResolvedValue({ ok: true })
    mocks.application.persistCreatedJsonWallet.mockResolvedValue({
      ok: true,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123' }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })
  })

  it('creates wallet drafts in the workflow and advances to the confirm step', async () => {
    mocks.application.createJsonWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Alice',
      account: {
        address: 'AQ123',
        publicKey: 'PUB-1',
      },
      content: { name: 'Alice' },
      wif: 'WIF-1',
    })

    const page = useCreateJsonWalletPage()

    page.basicLabel.value = 'Alice'
    page.basicPassword.value = 'secret123'
    page.basicRePassword.value = 'secret123'

    await page.submitCreateJsonWalletBasicStep()
    await nextTick()

    expect(page.currentStep.value).toBe(1)
    expect(page.createdAddress.value).toBe('AQ123')
    expect(mocks.application.downloadCreatedJsonWallet).toHaveBeenCalledWith({
      address: 'AQ123',
      publicKey: 'PUB-1',
    })
  })

  it('persists created wallets, updates cache state, and routes back to wallets', async () => {
    const page = useCreateJsonWalletPage()
    page.basicLabel.value = 'Alice'
    page.basicPassword.value = 'secret123'
    page.basicRePassword.value = 'secret123'
    mocks.application.createJsonWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Alice',
      account: {
        address: 'AQ123',
        publicKey: 'PUB-1',
      },
      content: { name: 'Alice' },
      wif: 'WIF-1',
    })

    await page.submitCreateJsonWalletBasicStep()
    await nextTick()

    await page.submitCreateJsonWalletConfirmStep()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [{ address: 'AQ123' }],
      sharedWallets: [] as unknown[],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('createJsonWallet.createSuccess')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
    expect(page.currentStep.value).toBe(0)
    expect(page.createdAddress.value).toBe('')
  })
})
