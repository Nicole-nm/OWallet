import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  settingStore: {
    network: 'testnet',
  },
  walletsStore: {
    setWalletCollections: vi.fn(),
    setWalletCollectionsLoaded: vi.fn(),
  },
  loading: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  },
  application: {
    createSharedWalletDraft: vi.fn(),
    submitSharedWalletCreation: vi.fn(),
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

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: any[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: any[]) => mocks.feedback.notifySuccess(...args),
}))

vi.mock('../../modules/wallet/application/createSharedWalletApplicationService', () => ({
  createSharedWalletDraft: (...args: any[]) => mocks.application.createSharedWalletDraft(...args),
  submitSharedWalletCreation: (...args: any[]) =>
    mocks.application.submitSharedWalletCreation(...args),
}))

import { useCreateSharedWalletPage } from './useCreateSharedWalletPage'

describe('useCreateSharedWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a shared wallet draft in the workflow and advances to confirmation', async () => {
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })

    const page = useCreateSharedWalletPage()

    page.basicLabel.value = 'Core Team'
    page.updateCreateSharedWalletCopayerName({ index: 0, value: 'Alice' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 0, value: 'A'.repeat(66) })
    page.updateCreateSharedWalletCopayerName({ index: 1, value: 'Bob' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 1, value: 'B'.repeat(66) })

    await page.submitCreateSharedWalletBasicStep()

    expect(page.currentStep.value).toBe(1)
    expect(page.createdLabel.value).toBe('Core Team')
    expect(page.copayers.value).toEqual([
      { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
      { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
    ])
  })

  it('submits shared wallet creation in the workflow and refreshes wallet cache', async () => {
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })
    mocks.application.submitSharedWalletCreation.mockResolvedValue({
      ok: true,
      sharedWalletAddress: 'shared-address',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    const page = useCreateSharedWalletPage()
    page.basicLabel.value = 'Core Team'
    page.updateCreateSharedWalletCopayerName({ index: 0, value: 'Alice' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 0, value: 'A'.repeat(66) })
    page.updateCreateSharedWalletCopayerName({ index: 1, value: 'Bob' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 1, value: 'B'.repeat(66) })

    await page.submitCreateSharedWalletBasicStep()

    await page.submitCreateSharedWalletConfirmStep()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [] as unknown[],
      sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('createSharedWallet.createSuccess')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
    expect(page.currentStep.value).toBe(0)
    expect(page.createdLabel.value).toBe('')
  })
})
