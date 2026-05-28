import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { createLogger } from '../../shared/lib/logger'
import {
  createValidationErrors,
  resetValidationErrors as clearValidationErrors,
} from '../../shared/lib/formValidation'
import { handleWorkflowError } from '../../shared/lib/workflowErrorHandler'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import { persistImportedJsonWallet } from '../../modules/wallet/application/importJsonWalletApplicationService'
import { ROUTE_NAMES } from '../../router/routes'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { applyWalletCollectionsResult } from '../support/walletCollectionsStoreSync'
import {
  IMPORT_JSON_VALIDATION_FIELDS,
  type ImportJsonWalletAccount,
  type ImportJsonWalletField,
  type ImportJsonWalletForm,
  type ImportJsonWalletValidationErrors,
  type PersistSingleWalletOptions,
} from './importJsonWallet.types'
import { useImportDatWallet } from './useImportDatWallet'
import { useImportMnemonicWallet } from './useImportMnemonicWallet'
import { useImportPrivateKeyWallet } from './useImportPrivateKeyWallet'
import { useImportWifWallet } from './useImportWifWallet'

const logger = createLogger('useImportJsonWalletPage')

export function useImportJsonWalletPage() {
  const { t } = useI18n()
  const router = useRouter()
  const loadingStore = useLoadingModalStore()
  const walletsStore = useWalletsStore()

  const form = reactive<ImportJsonWalletForm>({
    tabName: 'wif',
    pk: '',
    pkLabel: '',
    pkPassword: '',
    pkRePassword: '',
    datPath: t('importJsonWallet.datFile'),
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
  })
  const datFile = ref<File | null>(null)
  const updatingWallet = ref<ImportJsonWalletAccount | null>(null)
  const validationErrors = reactive<ImportJsonWalletValidationErrors>(
    createValidationErrors(IMPORT_JSON_VALIDATION_FIELDS)
  )

  function resetImportJsonValidationErrors() {
    clearValidationErrors(validationErrors, IMPORT_JSON_VALIDATION_FIELDS)
  }

  function updateImportJsonField<TField extends ImportJsonWalletField>({
    field,
    value,
  }: {
    field: TField
    value: ImportJsonWalletForm[TField]
  }) {
    form[field] = value
  }

  function updateImportJsonDatLabel({ index, value }: { index: number; value: string }) {
    form.datLabel[index] = value
  }

  function updateImportJsonDatPassword({ index, value }: { index: number; value: string }) {
    form.datPassword[index] = value
  }

  async function persistSingleWallet(
    account: ImportJsonWalletAccount,
    options: PersistSingleWalletOptions = {}
  ) {
    const { redirect = true, promptOnDuplicate = true, showSuccess = true } = options
    const result = await persistImportedJsonWallet(account)

    if (result.duplicate) {
      if (promptOnDuplicate) {
        loadingStore.hideLoadingModals()
        form.confirmModal = true
        updatingWallet.value = result.account
      }
      return { inserted: false, duplicate: true }
    }

    if (!result.ok || !result.inserted) {
      if (redirect) {
        loadingStore.hideLoadingModals()
        notifyError('importJsonWallet.saveDbFailed')
      }
      return { inserted: false }
    }

    applyWalletCollectionsResult(walletsStore, result.collectionsResult)
    if (showSuccess) {
      notifySuccess('importJsonWallet.success')
    }
    if (redirect) {
      loadingStore.hideLoadingModals()
      await router.push({ name: ROUTE_NAMES.WALLETS })
    }
    return { inserted: true }
  }

  const privateKeyTab = useImportPrivateKeyWallet({
    form,
    validationErrors,
    t,
    loadingStore,
    notifyError,
    persistSingleWallet,
  })
  const wifTab = useImportWifWallet({
    form,
    validationErrors,
    t,
    loadingStore,
    notifyError,
    persistSingleWallet,
  })
  const mnemonicTab = useImportMnemonicWallet({
    form,
    validationErrors,
    t,
    loadingStore,
    notifyError,
    persistSingleWallet,
  })
  const datTab = useImportDatWallet({
    form,
    datFile,
    t,
    loadingStore,
    notifyError,
    notifySuccess,
    applyCollectionsResult: (collectionsResult) =>
      applyWalletCollectionsResult(walletsStore, collectionsResult),
    goToWallets: () => router.push({ name: ROUTE_NAMES.WALLETS }),
  })

  async function submitImportJsonWallet() {
    if (form.tabName === 'pk') {
      if (!privateKeyTab.validatePkForm()) {
        return
      }

      loadingStore.showLoadingModals()
      await privateKeyTab.importAccountForPK()
      return
    }

    if (form.tabName === 'dat') {
      if (
        !datFile.value ||
        !Array.isArray(form.datWallet?.accounts) ||
        form.datWallet.accounts.length === 0
      ) {
        notifyError('importJsonWallet.invalidDatFile')
        return
      }

      loadingStore.showLoadingModals()
      await datTab.importAccountForDat()
      return
    }

    if (form.tabName === 'wif') {
      if (!wifTab.validateWifForm()) {
        return
      }

      loadingStore.showLoadingModals()
      await wifTab.importAccountForWif()
      return
    }

    if (!mnemonicTab.validateMnemonicForm()) {
      return
    }

    loadingStore.showLoadingModals()
    await mnemonicTab.importAccountForMnemonic()
  }

  function cancelImportJsonWallet() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  async function handleImportJsonConfirmOk() {
    if (!updatingWallet.value) {
      return
    }

    loadingStore.showLoadingModals()
    try {
      const result = await persistImportedJsonWallet(updatingWallet.value, {
        overwrite: true,
      })
      if (!result.ok || !result.updated) {
        throw new Error(result.status)
      }

      applyWalletCollectionsResult(walletsStore, result.collectionsResult)
      form.confirmModal = false
      updatingWallet.value = null
      notifySuccess('importJsonWallet.success')
      await router.push({ name: ROUTE_NAMES.WALLETS })
    } catch (error: unknown) {
      handleWorkflowError({
        error,
        logger,
        context: 'handleImportJsonConfirmOk',
        errorKey: 'importJsonWallet.saveDbFailed',
      })
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  function handleImportJsonConfirmCancel() {
    form.confirmModal = false
    updatingWallet.value = null
  }

  return {
    ...useWizardPage({
      backRouteName: ROUTE_NAMES.WALLETS,
    }),
    form,
    validationErrors,
    updateImportJsonField,
    updateImportJsonDatLabel,
    updateImportJsonDatPassword,
    submitImportJsonWallet,
    handleImportJsonFileChange: datTab.handleImportJsonFileChange,
    cancelImportJsonWallet,
    handleImportJsonConfirmOk,
    handleImportJsonConfirmCancel,
    resetImportJsonValidationErrors,
  }
}
