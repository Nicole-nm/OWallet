import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  downloadStoredWalletFile,
  exportStoredWalletWif,
  validateStoredWalletPassword,
} from '../../modules/wallet/application/dashboard/walletDetailApplicationService'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { notifyError, showSuccessModal } from '../../shared/ui/feedback'

export type WalletAction = 'TO_DELETE' | 'TO_EXPORT' | 'EXPORT_WIF' | ''

export function useWalletExport(
  wallet: () => Record<string, unknown>,
  isCommonWallet: () => boolean,
  onDeleteRequested: () => void,
  closeChangePassTip: () => void = () => {}
) {
  const { t } = useI18n()
  const loadingStore = useLoadingModalStore()

  const passModal = ref(false)
  const password = ref('')

  const option = ref<WalletAction>('')

  function openModal(opt: WalletAction) {
    passModal.value = true
    option.value = opt
  }

  function handleExportWallet() {
    openModal('TO_EXPORT')
  }

  function handleExportWIF() {
    openModal('EXPORT_WIF')
  }

  async function exportWallet(commonWallet: Record<string, unknown>) {
    loadingStore.hideLoadingModals()
    const result = await downloadStoredWalletFile(commonWallet)
    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
      return
    }
    closeChangePassTip()
  }

  function handleCancel() {
    passModal.value = false
    password.value = ''
  }

  async function handleValidatePassword() {
    if (!isCommonWallet()) {
      onDeleteRequested()
      return
    }

    if (!password.value) {
      notifyError('common.enterWalletPassword')
      return
    }

    loadingStore.showLoadingModals()

    if (option.value === 'EXPORT_WIF') {
      const exportResult = await exportStoredWalletWif(wallet(), password.value)
      if (!exportResult.ok) {
        notifyError(exportResult.errorKey || 'common.networkErr')
        loadingStore.hideLoadingModals()
        return
      }

      passModal.value = false
      loadingStore.hideLoadingModals()
      showSuccessModal({
        title: t('wallets.exportedWIF'),
        content: exportResult.wif,
        literalTitle: true,
      })
      password.value = ''
      return
    }

    const validationResult = await validateStoredWalletPassword(wallet(), password.value)
    if (!validationResult.ok) {
      loadingStore.hideLoadingModals()
      notifyError(validationResult.errorKey || 'common.networkErr')
      return
    }

    if (option.value === 'TO_DELETE') {
      onDeleteRequested()
    } else if (option.value === 'TO_EXPORT') {
      passModal.value = false
      await exportWallet(wallet())
    }

    password.value = ''
  }

  return {
    passModal,
    password,
    option,
    openModal,
    handleExportWallet,
    handleExportWIF,
    exportWallet,
    handleCancel,
    handleValidatePassword,
  }
}
