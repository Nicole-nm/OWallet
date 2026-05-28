import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeStoredWalletPassword } from '../../modules/wallet/application/walletDetailApplicationService'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'

export function usePasswordChange(wallet: () => Record<string, unknown>) {
  const { t } = useI18n()
  const loadingStore = useLoadingModalStore()
  const currentWalletStore = useCurrentWalletStore()

  const oldPassword = ref('')
  const newPassword = ref('')
  const reNewPassword = ref('')
  const changePassErrors = ref({
    oldPassword: '',
    newPassword: '',
    reNewPassword: '',
  })
  const changePassModal = ref(false)
  const showChangePassTip = ref(false)

  function handleChangePassword() {
    changePassErrors.value = {
      oldPassword: '',
      newPassword: '',
      reNewPassword: '',
    }
    changePassModal.value = true
  }

  function validateChangePassForm() {
    const nextErrors = {
      oldPassword: '',
      newPassword: '',
      reNewPassword: '',
    }

    if (!oldPassword.value) {
      nextErrors.oldPassword = `${t('FormField.oldPassword')} is required`
    } else if (oldPassword.value.length < 6) {
      nextErrors.oldPassword = `${t('FormField.oldPassword')} must be at least 6 characters`
    }

    if (!newPassword.value) {
      nextErrors.newPassword = `${t('FormField.newPassword')} is required`
    } else if (newPassword.value.length < 6) {
      nextErrors.newPassword = `${t('FormField.newPassword')} must be at least 6 characters`
    }

    if (!reNewPassword.value) {
      nextErrors.reNewPassword = `${t('FormField.newPasswordConfirmation')} is required`
    } else if (reNewPassword.value.length < 6) {
      nextErrors.reNewPassword = `${t('FormField.newPasswordConfirmation')} must be at least 6 characters`
    } else if (reNewPassword.value !== newPassword.value) {
      nextErrors.reNewPassword = `${t('FormField.newPasswordConfirmation')} does not match`
    }

    changePassErrors.value = nextErrors
    return !Object.values(nextErrors).some(Boolean)
  }

  async function handleChangePassOk() {
    if (!validateChangePassForm()) {
      return
    }

    loadingStore.showLoadingModals()

    const result = await changeStoredWalletPassword(wallet(), oldPassword.value, newPassword.value)
    if (!result.ok) {
      loadingStore.hideLoadingModals()
      notifyError(result.errorKey || 'importJsonWallet.saveDbFailed')
      return
    }

    if (currentWalletStore.wallet.address === result.wallet.address) {
      currentWalletStore.mergeCurrentWallet({ wallet: result.wallet })
    }

    loadingStore.hideLoadingModals()
    changePassModal.value = false
    notifySuccess('wallets.changePassSuccess')
    oldPassword.value = ''
    newPassword.value = ''
    reNewPassword.value = ''
    changePassErrors.value = {
      oldPassword: '',
      newPassword: '',
      reNewPassword: '',
    }
    showChangePassTip.value = true
  }

  function handleChangePassCancel() {
    changePassModal.value = false
    oldPassword.value = ''
    newPassword.value = ''
    reNewPassword.value = ''
    changePassErrors.value = {
      oldPassword: '',
      newPassword: '',
      reNewPassword: '',
    }
  }

  function handleShowChangePassTipOk() {
    showChangePassTip.value = false
  }

  return {
    oldPassword,
    newPassword,
    reNewPassword,
    changePassErrors,
    changePassModal,
    showChangePassTip,
    handleChangePassword,
    handleChangePassOk,
    handleChangePassCancel,
    handleShowChangePassTipOk,
  }
}
