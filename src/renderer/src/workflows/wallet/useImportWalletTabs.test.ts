import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ImportJsonWalletForm,
  ImportJsonWalletValidationErrors,
} from './importJsonWallet.types'

const mocks = vi.hoisted(() => ({
  buildFromMnemonic: vi.fn(),
  buildFromPrivateKey: vi.fn(),
  buildFromWif: vi.fn(),
}))

vi.mock('../../modules/wallet/application/json/importJsonWalletApplicationService', () => ({
  buildImportedJsonWalletDraftFromMnemonic: (...args: unknown[]) =>
    mocks.buildFromMnemonic(...args),
  buildImportedJsonWalletDraftFromPrivateKeyHex: (...args: unknown[]) =>
    mocks.buildFromPrivateKey(...args),
  buildImportedJsonWalletDraftFromWif: (...args: unknown[]) => mocks.buildFromWif(...args),
}))

import { useImportMnemonicWallet } from './useImportMnemonicWallet'
import { useImportPrivateKeyWallet } from './useImportPrivateKeyWallet'
import { useImportWifWallet } from './useImportWifWallet'

function createForm(): ImportJsonWalletForm {
  return {
    tabName: 'pk',
    pk: '',
    pkLabel: '',
    pkPassword: '',
    pkRePassword: '',
    datPath: '',
    datWallet: null,
    datLabel: [],
    datPassword: [],
    wif: '',
    wifLabel: '',
    wifPassword: '',
    wifRePassword: '',
    mnemonic: '',
    mnemonicLabel: '',
    mnemonicPassword: '',
    mnemonicRePassword: '',
    confirmModal: false,
  }
}

function createValidationErrors(): ImportJsonWalletValidationErrors {
  return {
    pk: '',
    pkLabel: '',
    pkPassword: '',
    pkRePassword: '',
    wif: '',
    wifLabel: '',
    wifPassword: '',
    wifRePassword: '',
    mnemonic: '',
    mnemonicLabel: '',
    mnemonicPassword: '',
    mnemonicRePassword: '',
  }
}

function createDeps() {
  return {
    form: createForm(),
    validationErrors: createValidationErrors(),
    t: (key: string) => key,
    loadingStore: {
      showLoadingModals: vi.fn(),
      hideLoadingModals: vi.fn(),
    },
    notifyError: vi.fn(),
    persistSingleWallet: vi.fn(),
  }
}

describe('JSON wallet import tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates private-key form fields and persists imported accounts', async () => {
    const deps = createDeps()
    const tab = useImportPrivateKeyWallet(deps)

    expect(tab.validatePkForm()).toBe(false)
    deps.form.pkLabel = 'PK Wallet'
    deps.form.pk = 'ab'
    deps.form.pkPassword = 'short'
    deps.form.pkRePassword = 'different'
    expect(tab.validatePkForm()).toBe(false)

    deps.form.pk = 'ab'.repeat(32)
    deps.form.pkPassword = 'secret123'
    deps.form.pkRePassword = 'secret123'
    expect(tab.validatePkForm()).toBe(true)

    mocks.buildFromPrivateKey.mockResolvedValueOnce({ ok: false })
    await tab.importAccountForPK()
    expect(deps.notifyError).toHaveBeenCalledWith('importJsonWallet.invalidPrivateKey')
    expect(deps.loadingStore.hideLoadingModals).toHaveBeenCalled()

    mocks.buildFromPrivateKey.mockResolvedValueOnce({ ok: true, account: { address: 'AQPK' } })
    await tab.importAccountForPK()
    expect(deps.persistSingleWallet).toHaveBeenCalledWith({ address: 'AQPK' })
  })

  it('validates WIF form fields and persists imported accounts', async () => {
    const deps = createDeps()
    const tab = useImportWifWallet(deps)

    expect(tab.validateWifForm()).toBe(false)
    deps.form.wifLabel = 'WIF Wallet'
    deps.form.wif = 'wif'
    deps.form.wifPassword = 'short'
    deps.form.wifRePassword = 'different'
    expect(tab.validateWifForm()).toBe(false)

    deps.form.wifPassword = 'secret123'
    deps.form.wifRePassword = 'secret123'
    expect(tab.validateWifForm()).toBe(true)

    mocks.buildFromWif.mockResolvedValueOnce({ ok: false })
    await tab.importAccountForWif()
    expect(deps.notifyError).toHaveBeenCalledWith('basicInfo.errWif')

    mocks.buildFromWif.mockResolvedValueOnce({ ok: true, account: { address: 'AQWIF' } })
    await tab.importAccountForWif()
    expect(deps.persistSingleWallet).toHaveBeenCalledWith({ address: 'AQWIF' })
  })

  it('validates mnemonic form fields and persists imported accounts', async () => {
    const deps = createDeps()
    const tab = useImportMnemonicWallet(deps)

    expect(tab.validateMnemonicForm()).toBe(false)
    deps.form.mnemonicLabel = 'Mnemonic Wallet'
    deps.form.mnemonic = 'one two three'
    deps.form.mnemonicPassword = 'short'
    deps.form.mnemonicRePassword = 'different'
    expect(tab.validateMnemonicForm()).toBe(false)

    deps.form.mnemonicPassword = 'secret123'
    deps.form.mnemonicRePassword = 'secret123'
    expect(tab.validateMnemonicForm()).toBe(true)

    mocks.buildFromMnemonic.mockResolvedValueOnce({ ok: false })
    await tab.importAccountForMnemonic()
    expect(deps.notifyError).toHaveBeenCalledWith('basicInfo.InvalidMnemonic')

    mocks.buildFromMnemonic.mockResolvedValueOnce({
      ok: true,
      account: { address: 'AQMNEMONIC' },
    })
    await tab.importAccountForMnemonic()
    expect(deps.persistSingleWallet).toHaveBeenCalledWith({ address: 'AQMNEMONIC' })
  })
})
