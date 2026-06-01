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
    notifyWarning: vi.fn(),
  },
  application: {
    queryImportableSharedWallet: vi.fn(),
    persistImportedSharedWallet: vi.fn(),
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
  notifyWarning: (...args: any[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock(
  '../../modules/wallet/application/sharedWallet/importSharedWalletApplicationService',
  () => ({
    queryImportableSharedWallet: (...args: any[]) =>
      mocks.application.queryImportableSharedWallet(...args),
    persistImportedSharedWallet: (...args: any[]) =>
      mocks.application.persistImportedSharedWallet(...args),
  })
)

import { useImportSharedWalletPage } from './useImportSharedWalletPage'

describe('useImportSharedWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries importable shared wallets in the workflow and advances on success', async () => {
    mocks.application.queryImportableSharedWallet.mockResolvedValue({
      ok: true,
      wallet: {
        sharedWalletAddress: 'shared-address',
        sharedWalletName: 'Core Team',
      },
    })

    const page = useImportSharedWalletPage()

    page.searchText.value = 'shared-address'
    await page.submitImportSharedWalletQueryStep()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(page.currentStep.value).toBe(1)
    expect(page.sharedWallet.value).toEqual({
      sharedWalletAddress: 'shared-address',
      sharedWalletName: 'Core Team',
    })
  })

  it('reports an error and clears state when the query step fails', async () => {
    mocks.application.queryImportableSharedWallet.mockResolvedValue({
      ok: false,
      errorKey: 'importSharedWallet.serverDown',
    })
    const page = useImportSharedWalletPage()
    page.searchText.value = 'shared-address'

    await page.submitImportSharedWalletQueryStep()

    expect(page.sharedWallet.value).toBeNull()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('importSharedWallet.serverDown')
    expect(page.currentStep.value).toBe(0)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
  })

  it('falls back to a generic error key when the query step fails without one', async () => {
    mocks.application.queryImportableSharedWallet.mockResolvedValue({ ok: false })
    const page = useImportSharedWalletPage()
    await page.submitImportSharedWalletQueryStep()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('importSharedWallet.notFound')
  })

  it('cancelImportSharedWalletQueryStep routes back to the wallets list', () => {
    const page = useImportSharedWalletPage()
    page.cancelImportSharedWalletQueryStep()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('backImportSharedWalletConfirmStep returns to step 0', () => {
    const page = useImportSharedWalletPage()
    page.currentStep.value = 1
    page.backImportSharedWalletConfirmStep()
    expect(page.currentStep.value).toBe(0)
  })

  it('handles duplicate import warnings in the confirm step', async () => {
    mocks.application.persistImportedSharedWallet.mockResolvedValue({
      ok: false,
      duplicate: true,
      errorKey: 'importSharedWallet.duplicate',
    })
    const page = useImportSharedWalletPage()
    await page.submitImportSharedWalletConfirmStep()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('importSharedWallet.duplicate')
  })

  it('handles generic failures in the confirm step', async () => {
    mocks.application.persistImportedSharedWallet.mockResolvedValue({
      ok: false,
      errorKey: 'common.savedbFailed',
    })
    const page = useImportSharedWalletPage()
    await page.submitImportSharedWalletConfirmStep()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('common.savedbFailed')
  })

  it('falls back to common.savedbFailed when the failure has no errorKey', async () => {
    mocks.application.persistImportedSharedWallet.mockResolvedValue({ ok: false })
    const page = useImportSharedWalletPage()
    await page.submitImportSharedWalletConfirmStep()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('common.savedbFailed')
  })

  it('persists imported shared wallets in the workflow and refreshes wallet cache', async () => {
    mocks.application.queryImportableSharedWallet.mockResolvedValue({
      ok: true,
      wallet: {
        sharedWalletAddress: 'shared-address',
        sharedWalletName: 'Core Team',
      },
    })
    mocks.application.persistImportedSharedWallet.mockResolvedValue({
      ok: true,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    const page = useImportSharedWalletPage()
    page.searchText.value = 'shared-address'

    await page.submitImportSharedWalletQueryStep()

    await page.submitImportSharedWalletConfirmStep()

    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [] as unknown[],
      sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('importSharedWallet.success')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
    expect(page.currentStep.value).toBe(0)
    expect(page.sharedWallet.value).toEqual({})
  })
})
