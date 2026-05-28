import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  createJsonWalletDraft,
  downloadCreatedJsonWallet,
  persistCreatedJsonWallet,
  type JsonWalletDraft,
} from '../../modules/wallet/application/createJsonWalletApplicationService'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { createValidationErrors } from '../../shared/lib/formValidation'
import { notifyError, notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { ROUTE_NAMES } from '../../router/routes'
import { applyWalletCollectionsResult } from '../support/walletCollectionsStoreSync'

const CREATE_JSON_VALIDATION_FIELDS = ['label', 'password', 'rePassword'] as const

export function useCreateJsonWalletPage() {
  const { t } = useI18n()
  const router = useRouter()
  const walletsStore = useWalletsStore()
  const loadingStore = useLoadingModalStore()
  const currentStep = ref(0)
  const createdLabel = ref('')
  const createdAccount = ref<JsonWalletDraft | null>(null)
  const createdAddress = ref('')
  const createdPublicKey = ref('')
  const createdWif = ref('')

  const basicLabel = ref('')
  const basicPassword = ref('')
  const basicRePassword = ref('')
  const basicValidationErrors = ref(createValidationErrors(CREATE_JSON_VALIDATION_FIELDS))

  function resetBasicStep() {
    basicLabel.value = ''
    basicPassword.value = ''
    basicRePassword.value = ''
    basicValidationErrors.value = createValidationErrors(CREATE_JSON_VALIDATION_FIELDS)
  }

  function resetCreateJsonWalletFlow() {
    currentStep.value = 0
    createdLabel.value = ''
    createdAccount.value = null
    createdAddress.value = ''
    createdPublicKey.value = ''
    createdWif.value = ''
    resetBasicStep()
  }

  function validateBasicStep() {
    const nextValidationErrors = createValidationErrors(CREATE_JSON_VALIDATION_FIELDS)

    if (!basicLabel.value.trim()) {
      nextValidationErrors.label = t('validation.required', {
        field: t('createJsonWallet.label'),
      })
    }

    if (!basicPassword.value) {
      nextValidationErrors.password = t('validation.required', {
        field: t('createJsonWallet.password'),
      })
    } else if (basicPassword.value.length < 6) {
      nextValidationErrors.password = t('validation.minLength', {
        field: t('createJsonWallet.password'),
        min: 6,
      })
    }

    if (!basicRePassword.value) {
      nextValidationErrors.rePassword = t('validation.required', {
        field: t('FormField.passwordConfirmation'),
      })
    } else if (basicRePassword.value.length < 6) {
      nextValidationErrors.rePassword = t('validation.minLength', {
        field: t('FormField.passwordConfirmation'),
        min: 6,
      })
    } else if (basicRePassword.value !== basicPassword.value) {
      nextValidationErrors.rePassword = t('validation.mismatch', {
        field: t('FormField.passwordConfirmation'),
      })
    }

    basicValidationErrors.value = nextValidationErrors
    const firstError = Object.values(nextValidationErrors).find(Boolean)
    if (firstError) {
      notifyWarning(firstError, { literal: true })
      return false
    }

    return true
  }

  async function submitCreateJsonWalletBasicStep() {
    if (!validateBasicStep()) {
      return
    }

    const result = await createJsonWalletDraft({
      label: basicLabel.value,
      password: basicPassword.value,
    })

    if (!result.ok) {
      notifyError(result.errorKey || 'createJsonWallet.createFail')
      return
    }

    createdLabel.value = result.label || ''
    createdAccount.value = result.account as JsonWalletDraft
    createdAddress.value = String(result.account?.address || '')
    createdPublicKey.value = String(result.account?.publicKey || '')
    createdWif.value = result.wif || ''
    currentStep.value = 1
  }

  function cancelCreateJsonWalletBasicStep() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  async function downloadCreateJsonWalletBackup() {
    if (!createdAccount.value) {
      return { ok: false }
    }

    return downloadCreatedJsonWallet(createdAccount.value)
  }

  function backCreateJsonWalletConfirmStep() {
    resetCreateJsonWalletFlow()
  }

  async function submitCreateJsonWalletConfirmStep() {
    loadingStore.showLoadingModals()

    try {
      const result = await persistCreatedJsonWallet({
        account: createdAccount.value,
        wif: createdWif.value,
      })

      if (!result.ok) {
        notifyError(result.errorKey || 'common.savedbFailed')
        if ('reason' in result && result.reason === 'invalid_wif') {
          backCreateJsonWalletConfirmStep()
        }
        return
      }

      applyWalletCollectionsResult(walletsStore, result.collectionsResult)
      resetCreateJsonWalletFlow()
      notifySuccess('createJsonWallet.createSuccess')
      await router.push({ name: ROUTE_NAMES.WALLETS })
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  watch(currentStep, (step) => {
    if (step === 1 && createdAccount.value) {
      void downloadCreateJsonWalletBackup().catch(() => {})
    }
  })

  onBeforeUnmount(() => {
    resetCreateJsonWalletFlow()
  })

  return {
    ...useWizardPage({
      currentStep,
      backRouteName: ROUTE_NAMES.WALLETS,
      stepTitleKeys: ['createJsonWallet.basicInfo', 'createJsonWallet.confirmInfo'],
    }),
    basicLabel,
    basicPassword,
    basicRePassword,
    basicValidationErrors,
    createdLabel,
    createdAddress,
    createdPublicKey,
    createdWif,
    cancelCreateJsonWalletBasicStep,
    submitCreateJsonWalletBasicStep,
    backCreateJsonWalletConfirmStep,
    downloadCreateJsonWalletBackup,
    submitCreateJsonWalletConfirmStep,
  }
}
