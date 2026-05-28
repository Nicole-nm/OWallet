import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  createIdentityRegistrationDraft,
  loadIdentityPayerWalletOptions,
  persistCreatedIdentity,
  submitIdentityRegistration,
} from '../../modules/identity/application/createIdentityApplicationService'
import { useLedgerStatusMonitor } from '../../modules/wallet/ledger/statusMonitor'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { createValidationErrors } from '../../shared/lib/formValidation'
import { notifyError, notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { ROUTE_NAMES } from '../../router/routes'
import { Identity, CommonWallet, WalletOption } from '../../shared/lib/types'

const CREATE_IDENTITY_VALIDATION_FIELDS = ['label', 'password', 'rePassword'] as const

type CreateIdentityErrorResult = {
  cancelled?: boolean
  level?: string
  errorKey?: string
  messageKey?: string
  message?: string
  error?: unknown
}

export function useCreateIdentityPage() {
  const { t } = useI18n()
  const router = useRouter()
  const loadingStore = useLoadingModalStore()
  const currentStep = ref(0)
  const createdLabel = ref('')
  const createdOntid = ref('')
  const createdIdentity = ref<Identity | null>(null)

  const basicLabel = ref('')
  const basicPassword = ref('')
  const basicRePassword = ref('')
  const payerWalletType = ref('commonWallet')
  const payerWalletValue = ref<string | undefined>(undefined)
  const payerWallet = ref<CommonWallet | null>(null)
  const payerWalletOptions = ref<WalletOption[]>([])
  const payerPassword = ref('')
  const basicValidationErrors = ref(createValidationErrors(CREATE_IDENTITY_VALIDATION_FIELDS))

  const { ledgerStatus, ledgerPk, ledgerWallet } = useLedgerStatusMonitor({
    shouldPoll: computed(() => currentStep.value === 0 && payerWalletType.value === 'ledgerWallet'),
  })

  function resetBasicStep() {
    basicLabel.value = ''
    basicPassword.value = ''
    basicRePassword.value = ''
    payerWalletType.value = 'commonWallet'
    payerWalletValue.value = undefined
    payerWallet.value = null
    payerPassword.value = ''
    basicValidationErrors.value = createValidationErrors(CREATE_IDENTITY_VALIDATION_FIELDS)
  }

  function resetCreateIdentityFlow() {
    currentStep.value = 0
    createdLabel.value = ''
    createdOntid.value = ''
    createdIdentity.value = null
    resetBasicStep()
  }

  function validateBasicStep() {
    const nextValidationErrors = createValidationErrors(CREATE_IDENTITY_VALIDATION_FIELDS)

    if (!basicLabel.value.trim()) {
      nextValidationErrors.label = t('validation.required', {
        field: t('createIdentity.label'),
      })
    }

    if (!basicPassword.value) {
      nextValidationErrors.password = t('validation.required', {
        field: t('createIdentity.password'),
      })
    } else if (basicPassword.value.length < 6) {
      nextValidationErrors.password = t('validation.minLength', {
        field: t('createIdentity.password'),
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
    return !Object.values(nextValidationErrors).some(Boolean)
  }

  function handleCreateIdentityError(result: CreateIdentityErrorResult | null | undefined) {
    if (!result || result.cancelled) {
      return
    }

    if (result.level === 'warning') {
      notifyWarning(result.errorKey || 'common.networkError')
      return
    }

    if (result.messageKey) {
      notifyError(result.messageKey)
      return
    }

    if (result.message) {
      notifyError(result.message || t('common.networkError'), { literal: true })
      return
    }

    notifyError(result.errorKey || 'common.networkError')
  }

  async function loadCreateIdentityWalletOptions() {
    const result = await loadIdentityPayerWalletOptions()
    payerWalletOptions.value = result.ok ? result.options : []
    return result
  }

  function cancelCreateIdentityBasicStep() {
    router.push({ name: ROUTE_NAMES.IDENTITIES })
  }

  function handleCreateIdentityPayerSelection(selection: { wallet: CommonWallet | null }) {
    payerWallet.value = selection.wallet
    payerWalletValue.value = selection.wallet?.address
  }

  async function submitCreateIdentityBasicStep() {
    if (payerWalletType.value === 'commonWallet' && !payerWallet.value) {
      notifyError('createIdentity.selectOneWallet')
      return
    }

    if (payerWalletType.value === 'commonWallet' && payerWallet.value && !payerPassword.value) {
      notifyError('createIdentity.enterPassword')
      return
    }

    if (!validateBasicStep()) {
      return
    }

    loadingStore.showLoadingModals()

    try {
      const draftResult = await createIdentityRegistrationDraft({
        label: basicLabel.value,
        password: basicPassword.value,
        payerWalletType: payerWalletType.value,
        payerWallet: payerWallet.value || undefined,
        ledgerWallet: ledgerWallet.value || undefined,
      })

      if (!draftResult.ok) {
        handleCreateIdentityError(draftResult)
        return
      }

      const submitResult = await submitIdentityRegistration({
        tx: draftResult.tx,
        payerWalletType: payerWalletType.value,
        payerWallet: payerWallet.value || undefined,
        payerPassword: payerPassword.value,
        ledgerWallet: ledgerWallet.value || undefined,
        ledgerConnected: Boolean(ledgerPk.value),
      })

      if (!submitResult.ok) {
        handleCreateIdentityError(submitResult as CreateIdentityErrorResult)
        return
      }

      createdLabel.value = draftResult.label || ''
      createdOntid.value = draftResult.ontid || ''
      createdIdentity.value = draftResult.identity || null
      notifySuccess('common.transSentSuccess')
      currentStep.value = 1
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  function backCreateIdentityConfirmStep() {
    resetCreateIdentityFlow()
  }

  async function submitCreateIdentityConfirmStep() {
    const identity = createdIdentity.value
    if (!identity) {
      notifyError('common.savedbFailed')
      return
    }

    loadingStore.showLoadingModals()

    try {
      const result = await persistCreatedIdentity({
        ontid: createdOntid.value,
        identity,
      })

      if (!result.ok) {
        notifyError(result.errorKey || 'common.savedbFailed')
        return
      }

      resetCreateIdentityFlow()
      notifySuccess('createIdentity.createSuccess')
      await router.push({ name: ROUTE_NAMES.IDENTITIES })
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  watch(payerWalletType, () => {
    payerWalletValue.value = undefined
    payerWallet.value = null
    payerPassword.value = ''
  })

  onMounted(() => {
    void loadCreateIdentityWalletOptions()
  })

  onBeforeUnmount(() => {
    resetCreateIdentityFlow()
  })

  return {
    ...useWizardPage({
      currentStep,
      backRouteName: ROUTE_NAMES.IDENTITIES,
      stepTitleKeys: ['createIdentity.basicInfo', 'createIdentity.confirmInfo'],
    }),
    basicLabel,
    basicPassword,
    basicRePassword,
    payerWalletType,
    payerWalletValue,
    payerWalletOptions,
    payerPassword,
    basicValidationErrors,
    ledgerStatus,
    createdLabel,
    createdOntid,
    cancelCreateIdentityBasicStep,
    handleCreateIdentityPayerSelection,
    submitCreateIdentityBasicStep,
    backCreateIdentityConfirmStep,
    submitCreateIdentityConfirmStep,
  }
}
