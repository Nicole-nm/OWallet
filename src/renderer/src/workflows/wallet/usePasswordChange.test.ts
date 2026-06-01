import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  changeStoredWalletPassword: vi.fn(),
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  currentWalletStore: {
    wallet: { address: '' } as { address: string },
    mergeCurrentWallet: vi.fn(),
  },
  walletsStore: {
    updateCommonWallet: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('../../modules/wallet/application/dashboard/walletDetailApplicationService', () => ({
  changeStoredWalletPassword: (...args: unknown[]) => mocks.changeStoredWalletPassword(...args),
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: unknown[]) => mocks.feedback.notifySuccess(...args),
}))

import { usePasswordChange } from './usePasswordChange'

const stubWallet = { address: 'AOrig', key: 'old-enc' } as Record<string, unknown>

function setup(walletOverride?: Record<string, unknown>) {
  return usePasswordChange(() => walletOverride ?? stubWallet)
}

function fillValidForm(api: ReturnType<typeof setup>) {
  api.oldPassword.value = 'oldpass'
  api.newPassword.value = 'newpass'
  api.reNewPassword.value = 'newpass'
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.currentWalletStore.wallet = { address: '' }
})

describe('usePasswordChange', () => {
  it('replaces the wallet in the Wallets store and merges the current wallet when addresses match', async () => {
    const updatedWallet = { address: 'AOrig', key: 'new-enc' }
    mocks.changeStoredWalletPassword.mockResolvedValue({ ok: true, wallet: updatedWallet })
    mocks.currentWalletStore.wallet = { address: 'AOrig' }

    const api = setup()
    fillValidForm(api)
    await api.handleChangePassOk()

    expect(mocks.changeStoredWalletPassword).toHaveBeenCalledWith(stubWallet, 'oldpass', 'newpass')
    expect(mocks.walletsStore.updateCommonWallet).toHaveBeenCalledWith('AOrig', updatedWallet)
    expect(mocks.currentWalletStore.mergeCurrentWallet).toHaveBeenCalledWith({
      wallet: updatedWallet,
    })
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('wallets.changePassSuccess')
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
    expect(api.changePassModal.value).toBe(false)
    expect(api.showChangePassTip.value).toBe(true)
    expect(api.oldPassword.value).toBe('')
    expect(api.newPassword.value).toBe('')
    expect(api.reNewPassword.value).toBe('')
  })

  it('updates the Wallets store but skips merging when the current wallet is a different address', async () => {
    const updatedWallet = { address: 'AOrig', key: 'new-enc' }
    mocks.changeStoredWalletPassword.mockResolvedValue({ ok: true, wallet: updatedWallet })
    mocks.currentWalletStore.wallet = { address: 'AOther' }

    const api = setup()
    fillValidForm(api)
    await api.handleChangePassOk()

    expect(mocks.walletsStore.updateCommonWallet).toHaveBeenCalledWith('AOrig', updatedWallet)
    expect(mocks.currentWalletStore.mergeCurrentWallet).not.toHaveBeenCalled()
  })

  it('does not mutate stores when the domain call fails', async () => {
    mocks.changeStoredWalletPassword.mockResolvedValue({ ok: false, errorKey: 'common.pwdErr' })

    const api = setup()
    fillValidForm(api)
    await api.handleChangePassOk()

    expect(mocks.walletsStore.updateCommonWallet).not.toHaveBeenCalled()
    expect(mocks.currentWalletStore.mergeCurrentWallet).not.toHaveBeenCalled()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('common.pwdErr')
    expect(mocks.loadingStore.hideLoadingModals).toHaveBeenCalled()
  })

  it('aborts before any domain call when the form fails validation', async () => {
    const api = setup()
    api.oldPassword.value = 'oldpass'
    api.newPassword.value = 'newpass'
    api.reNewPassword.value = 'mismatch'

    await api.handleChangePassOk()

    expect(mocks.changeStoredWalletPassword).not.toHaveBeenCalled()
    expect(mocks.walletsStore.updateCommonWallet).not.toHaveBeenCalled()
    expect(mocks.loadingStore.showLoadingModals).not.toHaveBeenCalled()
    expect(api.changePassErrors.value.reNewPassword).not.toBe('')
  })

  it('reports a required error when every password field is empty', async () => {
    const api = setup()
    api.oldPassword.value = ''
    api.newPassword.value = ''
    api.reNewPassword.value = ''

    await api.handleChangePassOk()

    expect(api.changePassErrors.value.oldPassword).toContain('FormField.oldPassword')
    expect(api.changePassErrors.value.oldPassword).toContain('is required')
    expect(api.changePassErrors.value.newPassword).toContain('FormField.newPassword')
    expect(api.changePassErrors.value.newPassword).toContain('is required')
    expect(api.changePassErrors.value.reNewPassword).toContain('FormField.newPasswordConfirmation')
    expect(api.changePassErrors.value.reNewPassword).toContain('is required')
    expect(mocks.changeStoredWalletPassword).not.toHaveBeenCalled()
  })

  it('reports length errors when every password field is shorter than 6 characters', async () => {
    const api = setup()
    api.oldPassword.value = 'old'
    api.newPassword.value = 'new'
    api.reNewPassword.value = 'new'

    await api.handleChangePassOk()

    expect(api.changePassErrors.value.oldPassword).toContain('at least 6 characters')
    expect(api.changePassErrors.value.newPassword).toContain('at least 6 characters')
    expect(api.changePassErrors.value.reNewPassword).toContain('at least 6 characters')
    expect(mocks.changeStoredWalletPassword).not.toHaveBeenCalled()
  })

  it('handleChangePassword clears prior errors and opens the modal', () => {
    const api = setup()
    api.changePassErrors.value = {
      oldPassword: 'x',
      newPassword: 'y',
      reNewPassword: 'z',
    }

    api.handleChangePassword()

    expect(api.changePassModal.value).toBe(true)
    expect(api.changePassErrors.value).toEqual({
      oldPassword: '',
      newPassword: '',
      reNewPassword: '',
    })
  })

  it('handleChangePassCancel closes the modal and clears state', () => {
    const api = setup()
    api.changePassModal.value = true
    api.oldPassword.value = 'oldpass'
    api.newPassword.value = 'newpass'
    api.reNewPassword.value = 'newpass'

    api.handleChangePassCancel()

    expect(api.changePassModal.value).toBe(false)
    expect(api.oldPassword.value).toBe('')
    expect(api.newPassword.value).toBe('')
    expect(api.reNewPassword.value).toBe('')
  })

  it('handleShowChangePassTipOk hides the success tip', () => {
    const api = setup()
    api.showChangePassTip.value = true

    api.handleShowChangePassTipOk()

    expect(api.showChangePassTip.value).toBe(false)
  })
})
