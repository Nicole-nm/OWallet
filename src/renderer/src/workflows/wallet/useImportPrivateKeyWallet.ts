import {
  hasValidationErrors,
  validateExactLength,
  validateMatch,
  validateMinLength,
  validateRequired,
} from '../../shared/lib/formValidation'
import { createValidationErrors } from '../../shared/lib/formValidation'
import { buildImportedJsonWalletDraftFromPrivateKeyHex } from '../../modules/wallet/application/importJsonWalletApplicationService'
import type { WalletImportTabDependencies } from './importJsonWallet.types'

const PK_VALIDATION_FIELDS = ['pk', 'pkPassword', 'pkRePassword'] as const

export function useImportPrivateKeyWallet({
  form,
  validationErrors,
  t,
  loadingStore,
  notifyError,
  persistSingleWallet,
}: WalletImportTabDependencies) {
  function validatePkForm() {
    const errors = createValidationErrors(PK_VALIDATION_FIELDS)
    const privateKeyLabel = t('FormField.privateKey')
    const passwordLabel = t('FormField.password')
    const passwordConfirmationLabel = t('FormField.passwordConfirmation')

    const hasPk = validateRequired(errors, 'pk', privateKeyLabel, form.pk)
    if (hasPk) {
      validateExactLength(errors, 'pk', privateKeyLabel, form.pk, 64)
    }

    const hasPassword = validateRequired(errors, 'pkPassword', passwordLabel, form.pkPassword)
    if (hasPassword) {
      validateMinLength(errors, 'pkPassword', passwordLabel, form.pkPassword, 6)
    }

    const hasRePassword = validateRequired(
      errors,
      'pkRePassword',
      passwordConfirmationLabel,
      form.pkRePassword
    )
    if (hasRePassword) {
      validateMinLength(errors, 'pkRePassword', passwordConfirmationLabel, form.pkRePassword, 6)
      validateMatch(
        errors,
        'pkRePassword',
        passwordConfirmationLabel,
        form.pkRePassword,
        form.pkPassword
      )
    }

    Object.assign(validationErrors, errors)
    return !hasValidationErrors(errors)
  }

  async function importAccountForPK() {
    const result = await buildImportedJsonWalletDraftFromPrivateKeyHex({
      label: form.pkLabel,
      privateKeyHex: form.pk,
      password: form.pkPassword,
    })
    if (!result.ok || !('account' in result)) {
      notifyError(result.errorKey || 'importJsonWallet.invalidPrivateKey')
      loadingStore.hideLoadingModals()
      return
    }

    await persistSingleWallet(result.account)
  }

  return {
    validatePkForm,
    importAccountForPK,
  }
}
