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
    t: (key: unknown, values?: Record<string, unknown>) => {
      if (key === 'importJsonWallet.importDatSuccessOne') {
        return `A total of ${String(values?.count)} address was imported successfully.`
      }

      if (key === 'importJsonWallet.importDatSuccessMany') {
        return `A total of ${String(values?.count)} addresses were imported successfully.`
      }

      return key
    },
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

vi.mock('../../modules/wallet/application/json/walletImportFileApplicationService', () => ({
  readImportedWalletFile: (...args: unknown[]) =>
    mocks.walletImportFile.readImportedWalletFile(...args),
}))

vi.mock('../../modules/wallet/application/json/importJsonWalletApplicationService', () => ({
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
import { getImportDatSuccessMessage } from './useImportDatWallet'

describe('getImportDatSuccessMessage', () => {
  const translate = (key: string, values?: Record<string, unknown>) => `${key}:${values?.count}`

  it('uses the singular message for one imported address', () => {
    expect(getImportDatSuccessMessage(translate, 1)).toBe('importJsonWallet.importDatSuccessOne:1')
  })

  it('uses the plural message for zero or multiple imported addresses', () => {
    expect(getImportDatSuccessMessage(translate, 0)).toBe('importJsonWallet.importDatSuccessMany:0')
    expect(getImportDatSuccessMessage(translate, 2)).toBe('importJsonWallet.importDatSuccessMany:2')
    expect(getImportDatSuccessMessage(translate, 1000)).toBe(
      'importJsonWallet.importDatSuccessMany:1\u2009000'
    )
  })
})

describe('useImportJsonWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('opens the DAT import tab by default', () => {
    const page = useImportJsonWalletPage()

    expect(page.form.tabName).toBe('dat')
  })

  it('requires a wallet name when importing a mnemonic wallet', async () => {
    const page = useImportJsonWalletPage()
    page.updateImportJsonField({ field: 'tabName', value: 'mnemonic' })
    page.updateImportJsonField({ field: 'mnemonic', value: 'abandon '.repeat(11) + 'about' })
    page.updateImportJsonField({ field: 'mnemonicPassword', value: 'secret123' })
    page.updateImportJsonField({ field: 'mnemonicRePassword', value: 'secret123' })

    await page.submitImportJsonWallet()

    expect(page.validationErrors.mnemonicLabel).toBe('importJsonWallet.label is required')
    expect(mocks.loading.showLoadingModals).not.toHaveBeenCalled()
    expect(mocks.application.buildImportedJsonWalletDraftFromMnemonic).not.toHaveBeenCalled()
  })

  it('requires a wallet name when importing a 64-hex private key wallet', async () => {
    const page = useImportJsonWalletPage()
    page.updateImportJsonField({ field: 'tabName', value: 'pk' })
    page.updateImportJsonField({ field: 'pk', value: 'a'.repeat(64) })
    page.updateImportJsonField({ field: 'pkPassword', value: 'secret123' })
    page.updateImportJsonField({ field: 'pkRePassword', value: 'secret123' })

    await page.submitImportJsonWallet()

    expect(page.validationErrors.pkLabel).toBe('importJsonWallet.label is required')
    expect(mocks.loading.showLoadingModals).not.toHaveBeenCalled()
    expect(mocks.application.buildImportedJsonWalletDraftFromPrivateKeyHex).not.toHaveBeenCalled()
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
      'A total of 1 address was imported successfully.',
      { literal: true }
    )
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('rejects DAT submissions before a wallet file is selected', async () => {
    const page = useImportJsonWalletPage()

    await page.submitImportJsonWallet()

    expect(mocks.loading.hideLoadingModals).not.toHaveBeenCalled()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('importJsonWallet.invalidDatFile')
  })

  it('reports failed DAT account imports', async () => {
    mocks.application.importDatWalletAccounts.mockResolvedValue({ ok: false })
    const datWallet = {
      accounts: [{ address: 'AQ123', key: 'encrypted-key', salt: 'salt' }],
    }
    mocks.walletImportFile.readImportedWalletFile.mockResolvedValue('{}')
    mocks.application.parseImportedDatWallet.mockReturnValue({
      ok: true,
      wallet: datWallet,
    })
    const page = useImportJsonWalletPage()
    await page.handleImportJsonFileChange({ originFileObj: { name: 'wallet.dat' } })

    await page.submitImportJsonWallet()

    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('importJsonWallet.importFailed')
    expect(mocks.router.push).not.toHaveBeenCalled()
  })

  it('accepts DAT files from a direct upload file wrapper', async () => {
    const file = { name: 'wallet.dat' }
    const datWallet = { accounts: [] as unknown[] }
    mocks.walletImportFile.readImportedWalletFile.mockResolvedValue('{"accounts":[]}')
    mocks.application.parseImportedDatWallet.mockReturnValue({
      ok: true,
      wallet: datWallet,
    })
    const page = useImportJsonWalletPage()

    await page.handleImportJsonFileChange({ file })

    expect(mocks.walletImportFile.readImportedWalletFile).toHaveBeenCalledWith(file)
    expect(page.form.datPath).toBe('importJsonWallet.selectedDatFilewallet.dat')
    expect(page.form.datWallet).toEqual(datWallet)
  })

  it('accepts DAT files from a native upload input event', async () => {
    const file = { name: 'wallet.dat' }
    mocks.walletImportFile.readImportedWalletFile.mockResolvedValue('{"accounts":[]}')
    mocks.application.parseImportedDatWallet.mockReturnValue({
      ok: true,
      wallet: { accounts: [] },
    })
    const page = useImportJsonWalletPage()

    await page.handleImportJsonFileChange({
      target: {
        value: 'C:\\fakepath\\wallet.dat',
        files: [file],
      },
    })

    expect(mocks.walletImportFile.readImportedWalletFile).toHaveBeenCalledWith(file)
    expect(page.form.datPath).toBe('importJsonWallet.selectedDatFilewallet.dat')
  })

  it('resets DAT selection for missing and rejected wallet files', async () => {
    const page = useImportJsonWalletPage()

    await page.handleImportJsonFileChange({})
    expect(page.form.datPath).toBe('importJsonWallet.datFile')
    expect(page.form.datWallet).toBeNull()

    mocks.walletImportFile.readImportedWalletFile.mockResolvedValue('invalid')
    mocks.application.parseImportedDatWallet.mockReturnValue({
      ok: false,
      errorKey: 'importJsonWallet.invalidDatFile',
    })
    await page.handleImportJsonFileChange({
      file: {
        originFileObj: {
          name: 'invalid.dat',
        },
      },
    })
    expect(page.form.datWallet).toBeNull()
  })
})
