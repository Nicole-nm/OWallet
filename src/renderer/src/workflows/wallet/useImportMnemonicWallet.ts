import {
  hasValidationErrors,
  validateMatch,
  validateMinLength,
  validateRequired,
} from '../../shared/lib/formValidation'
import { createValidationErrors } from '../../shared/lib/formValidation'
import { buildImportedJsonWalletDraftFromMnemonic } from '../../modules/wallet/application/importJsonWalletApplicationService'
import type { ImportJsonWalletAccount, WalletImportTabDependencies } from './importJsonWallet.types'

const MNEMONIC_VALIDATION_FIELDS = ['mnemonic', 'mnemonicPassword', 'mnemonicRePassword'] as const

export function useImportMnemonicWallet({
  form,
  validationErrors,
  t,
  loadingStore,
  notifyError,
  persistSingleWallet,
}: WalletImportTabDependencies) {
  function validateMnemonicForm() {
    const errors = createValidationErrors(MNEMONIC_VALIDATION_FIELDS)
    const mnemonicLabelField = t('FormField.mnemonic')
    const passwordLabel = t('FormField.password')
    const passwordConfirmationLabel = t('FormField.passwordConfirmation')

    validateRequired(errors, 'mnemonic', mnemonicLabelField, form.mnemonic)

    const hasPassword = validateRequired(
      errors,
      'mnemonicPassword',
      passwordLabel,
      form.mnemonicPassword
    )
    if (hasPassword) {
      validateMinLength(errors, 'mnemonicPassword', passwordLabel, form.mnemonicPassword, 6)
    }

    const hasRePassword = validateRequired(
      errors,
      'mnemonicRePassword',
      passwordConfirmationLabel,
      form.mnemonicRePassword
    )
    if (hasRePassword) {
      validateMinLength(
        errors,
        'mnemonicRePassword',
        passwordConfirmationLabel,
        form.mnemonicRePassword,
        6
      )
      validateMatch(
        errors,
        'mnemonicRePassword',
        passwordConfirmationLabel,
        form.mnemonicRePassword,
        form.mnemonicPassword
      )
    }

    Object.assign(validationErrors, errors)
    return !hasValidationErrors(errors)
  }

  async function importAccountForMnemonic() {
    const result = await buildImportedJsonWalletDraftFromMnemonic({
      label: form.mnemonicLabel,
      mnemonic: form.mnemonic,
      password: form.mnemonicPassword,
    })
    if (!result.ok) {
      notifyError(result.errorKey || 'basicInfo.InvalidMnemonic')
      loadingStore.hideLoadingModals()
      return
    }

    await persistSingleWallet(result.account as ImportJsonWalletAccount)
  }

  return {
    validateMnemonicForm,
    importAccountForMnemonic,
  }
}
