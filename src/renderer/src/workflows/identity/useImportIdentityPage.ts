import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES } from '../../router/routes'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { createValidationErrors } from '../../shared/lib/formValidation'
import { notifyError, notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import { importIdentityFromKeystore } from '../../modules/identity/application/importIdentityApplicationService'

const IMPORT_IDENTITY_VALIDATION_FIELDS = ['keystore', 'keystorePassword'] as const

interface ImportIdentityForm {
  keystore: string
  keystorePassword: string
}

type ImportIdentityField = keyof ImportIdentityForm

export function useImportIdentityPage() {
  const { t } = useI18n()
  const router = useRouter()
  const loadingStore = useLoadingModalStore()
  const form = reactive<ImportIdentityForm>({
    keystore: '',
    keystorePassword: '',
  })
  const validationErrors = reactive(createValidationErrors(IMPORT_IDENTITY_VALIDATION_FIELDS))

  function validateForm() {
    const nextValidationErrors = createValidationErrors(IMPORT_IDENTITY_VALIDATION_FIELDS)

    if (!form.keystore.trim()) {
      nextValidationErrors.keystore = `${t('importIdentity.keystore')} is required`
    }

    if (!form.keystorePassword) {
      nextValidationErrors.keystorePassword = `${t('FormField.password')} is required`
    } else if (form.keystorePassword.length < 6) {
      nextValidationErrors.keystorePassword = `${t('FormField.password')} must be at least 6 characters`
    }

    Object.assign(validationErrors, nextValidationErrors)
    return !Object.values(nextValidationErrors).some(Boolean)
  }

  function updateImportIdentityField({
    field,
    value,
  }: {
    field: ImportIdentityField
    value: string
  }) {
    form[field] = value
  }

  async function submitImportIdentity() {
    if (!validateForm()) {
      return { ok: false, errorKey: 'importIdentity.invalidForm' }
    }

    loadingStore.showLoadingModals()
    try {
      const result = await importIdentityFromKeystore({
        keystoreText: form.keystore,
        password: form.keystorePassword,
      })

      if (!result.ok) {
        if (result.duplicate) {
          notifyWarning(result.errorKey || 'importIdentity.duplicate')
        } else {
          notifyError(result.errorKey || 'importIdentity.importFailed')
        }
        return result
      }

      notifySuccess('importIdentity.importSuccess')
      await router.push({ name: ROUTE_NAMES.IDENTITIES })
      return result
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  function cancelImportIdentity() {
    return router.push({ name: ROUTE_NAMES.IDENTITIES })
  }

  return {
    ...useWizardPage({
      backRouteName: ROUTE_NAMES.IDENTITIES,
    }),
    form,
    validationErrors,
    updateImportIdentityField,
    submitImportIdentity,
    cancelImportIdentity,
  }
}
