import {
  hasValidationErrors,
  validateMatch,
  validateMinLength,
  validateRequired,
} from '../../shared/lib/formValidation'
import { createValidationErrors } from '../../shared/lib/formValidation'
import { buildImportedJsonWalletDraftFromWif } from '../../modules/wallet/application/importJsonWalletApplicationService'
import type { WalletImportTabDependencies } from './importJsonWallet.types'

const WIF_VALIDATION_FIELDS = ['wifLabel', 'wif', 'wifPassword', 'wifRePassword'] as const

export function useImportWifWallet({
  form,
  validationErrors,
  t,
  loadingStore,
  notifyError,
  persistSingleWallet,
}: WalletImportTabDependencies) {
  function validateWifForm() {
    const errors = createValidationErrors(WIF_VALIDATION_FIELDS)
    const labelField = t('FormField.label')
    const passwordLabel = t('FormField.password')
    const passwordConfirmationLabel = t('FormField.passwordConfirmation')

    validateRequired(errors, 'wifLabel', labelField, form.wifLabel)
    validateRequired(errors, 'wif', t('createJsonWallet.priavteKeywif'), form.wif)

    const hasPassword = validateRequired(errors, 'wifPassword', passwordLabel, form.wifPassword)
    if (hasPassword) {
      validateMinLength(errors, 'wifPassword', passwordLabel, form.wifPassword, 6)
    }

    const hasRePassword = validateRequired(
      errors,
      'wifRePassword',
      passwordConfirmationLabel,
      form.wifRePassword
    )
    if (hasRePassword) {
      validateMinLength(errors, 'wifRePassword', passwordConfirmationLabel, form.wifRePassword, 6)
      validateMatch(
        errors,
        'wifRePassword',
        passwordConfirmationLabel,
        form.wifRePassword,
        form.wifPassword
      )
    }

    Object.assign(validationErrors, errors)
    return !hasValidationErrors(errors)
  }

  async function importAccountForWif() {
    const result = await buildImportedJsonWalletDraftFromWif({
      label: form.wifLabel,
      wif: form.wif,
      password: form.wifPassword,
    })
    if (!result.ok || !('account' in result)) {
      notifyError(result.errorKey || 'basicInfo.errWif')
      loadingStore.hideLoadingModals()
      return
    }

    await persistSingleWallet(result.account)
  }

  return {
    validateWifForm,
    importAccountForWif,
  }
}
