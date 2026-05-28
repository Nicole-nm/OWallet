import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  loading: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  walletsStore: {
    normalWallets: [] as unknown[],
    sharedWallets: [] as unknown[],
    hardwareWallets: [] as unknown[],
    hasLoadedWallets: true,
    setWalletCollections: vi.fn(),
    setWalletCollectionsLoaded: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  },
  fileHelper: {
    readWalletFile: vi.fn(),
  },
  walletImportFile: {
    readImportedWalletFile: vi.fn(),
  },
  application: {
    buildImportedJsonWalletDraftFromMnemonic: vi.fn(),
    buildImportedJsonWalletDraftFromPrivateKeyHex: vi.fn(),
    buildImportedJsonWalletDraftFromWif: vi.fn(),
    importDatWalletAccounts: vi.fn(),
    parseImportedDatWallet: vi.fn(),
    persistImportedJsonWallet: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: unknown) => key,
  }),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: unknown[]) => mocks.feedback.notifySuccess(...args),
}))

vi.mock('../../shared/persistence/fileHelper', () => ({
  default: {
    readWalletFile: (...args: unknown[]) => mocks.fileHelper.readWalletFile(...args),
  },
}))

vi.mock('../../modules/wallet/application/walletImportFileApplicationService', () => ({
  readImportedWalletFile: (...args: unknown[]) =>
    mocks.walletImportFile.readImportedWalletFile(...args),
}))

vi.mock('../../modules/wallet/application/importJsonWalletApplicationService', () => ({
  buildImportedJsonWalletDraftFromMnemonic: (...args: unknown[]) =>
    mocks.application.buildImportedJsonWalletDraftFromMnemonic(...args),
  buildImportedJsonWalletDraftFromPrivateKeyHex: (...args: unknown[]) =>
    mocks.application.buildImportedJsonWalletDraftFromPrivateKeyHex(...args),
  buildImportedJsonWalletDraftFromWif: (...args: unknown[]) =>
    mocks.application.buildImportedJsonWalletDraftFromWif(...args),
  importDatWalletAccounts: (...args: unknown[]) =>
    mocks.application.importDatWalletAccounts(...args),
  parseImportedDatWallet: (...args: unknown[]) => mocks.application.parseImportedDatWallet(...args),
  persistImportedJsonWallet: (...args: unknown[]) =>
    mocks.application.persistImportedJsonWallet(...args),
}))

import { useImportJsonWalletPage } from './useImportJsonWalletPage'

describe('useImportJsonWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('imports a WIF wallet in the workflow and refreshes wallet cache', async () => {
    mocks.application.buildImportedJsonWalletDraftFromWif.mockResolvedValue({
      ok: true,
      account: {
        address: 'AQ123',
        publicKey: 'PUB-1',
      },
    })
    mocks.application.persistImportedJsonWallet.mockResolvedValue({
      ok: true,
      inserted: true,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123' }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    const page = useImportJsonWalletPage()
    page.updateImportJsonField({ field: 'tabName', value: 'wif' })
    page.updateImportJsonField({ field: 'wifLabel', value: 'Alice' })
    page.updateImportJsonField({ field: 'wif', value: 'WIF-1' })
    page.updateImportJsonField({ field: 'wifPassword', value: 'secret123' })
    page.updateImportJsonField({ field: 'wifRePassword', value: 'secret123' })

    await page.submitImportJsonWallet()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [{ address: 'AQ123' }],
      sharedWallets: [] as unknown[],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('importJsonWallet.success')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('prompts overwrite on duplicate imports and persists overwrite confirmation in the workflow', async () => {
    const duplicateAccount = {
      address: 'AQ123',
      publicKey: 'PUB-1',
    }

    mocks.application.buildImportedJsonWalletDraftFromWif.mockResolvedValue({
      ok: true,
      account: duplicateAccount,
    })
    mocks.application.persistImportedJsonWallet
      .mockResolvedValueOnce({
        ok: true,
        duplicate: true,
        account: duplicateAccount,
      })
      .mockResolvedValueOnce({
        ok: true,
        updated: true,
        collectionsResult: {
          ok: true,
          collections: {
            normalWallets: [{ address: 'AQ123' }],
            sharedWallets: [] as unknown[],
            hardwareWallets: [] as unknown[],
          },
        },
      })

    const page = useImportJsonWalletPage()
    page.updateImportJsonField({ field: 'tabName', value: 'wif' })
    page.updateImportJsonField({ field: 'wifLabel', value: 'Alice' })
    page.updateImportJsonField({ field: 'wif', value: 'WIF-1' })
    page.updateImportJsonField({ field: 'wifPassword', value: 'secret123' })
    page.updateImportJsonField({ field: 'wifRePassword', value: 'secret123' })

    await page.submitImportJsonWallet()

    expect(page.form.confirmModal).toBe(true)
    expect(mocks.router.push).not.toHaveBeenCalled()

    await page.handleImportJsonConfirmOk()

    expect(page.form.confirmModal).toBe(false)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('importJsonWallet.success')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('imports DAT wallet accounts through the DAT workflow tab', async () => {
    const datWallet = {
      scrypt: { n: 16384 },
      accounts: [{ address: 'AQ123', key: 'encrypted-key', salt: 'salt-1' }],
    }
    mocks.walletImportFile.readImportedWalletFile.mockResolvedValue('{"accounts":[]}')
    mocks.application.parseImportedDatWallet.mockReturnValue({
      ok: true,
      wallet: datWallet,
    })
    mocks.application.importDatWalletAccounts.mockResolvedValue({
      ok: true,
      insertedCount: 1,
      duplicateCount: 0,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123' }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    const page = useImportJsonWalletPage()
    page.updateImportJsonField({ field: 'tabName', value: 'dat' })
    await page.handleImportJsonFileChange({ originFileObj: { name: 'wallet.dat' } })
    page.updateImportJsonDatLabel({ index: 0, value: 'Alice' })
    page.updateImportJsonDatPassword({ index: 0, value: 'secret123' })

    await page.submitImportJsonWallet()

    expect(mocks.application.importDatWalletAccounts).toHaveBeenCalledWith({
      datWallet,
      entries: [
        {
          sourceAccount: datWallet.accounts[0],
          label: 'Alice',
          password: 'secret123',
        },
      ],
    })
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [{ address: 'AQ123' }],
      sharedWallets: [] as unknown[],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith(
      'A total of 1 addresses succeed to import.',
      { literal: true }
    )
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })
})
