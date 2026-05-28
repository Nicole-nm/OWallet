import { createLogger } from '../../shared/lib/logger'
import { handleWorkflowError } from '../../shared/lib/workflowErrorHandler'
import {
  importDatWalletAccounts,
  parseImportedDatWallet,
} from '../../modules/wallet/application/importJsonWalletApplicationService'
import { readImportedWalletFile } from '../../modules/wallet/application/walletImportFileApplicationService'
import type { DatWalletImportDependencies, ImportJsonDatAccount } from './importJsonWallet.types'

const logger = createLogger('useImportDatWallet')

export function useImportDatWallet({
  form,
  datFile,
  t,
  loadingStore,
  notifyError,
  notifySuccess,
  applyCollectionsResult,
  goToWallets,
}: DatWalletImportDependencies) {
  async function importAccountForDat() {
    const datWallet = form.datWallet
    if (!datWallet) {
      loadingStore.hideLoadingModals()
      notifyError('importJsonWallet.invalidDatFile')
      return
    }

    const result = await importDatWalletAccounts({
      datWallet,
      entries: datWallet.accounts.map((sourceAccount, index) => ({
        sourceAccount: sourceAccount as ImportJsonDatAccount,
        label: form.datLabel[index] || '',
        password: form.datPassword[index] || '',
      })),
    })

    loadingStore.hideLoadingModals()
    if (!result.ok) {
      notifyError('Import failed.', { literal: true })
      return
    }

    applyCollectionsResult(result.collectionsResult)
    notifySuccess(`A total of ${result.insertedCount} addresses succeed to import.`, {
      literal: true,
    })
    await goToWallets()
  }

  async function handleImportJsonFileChange(eventOrFile: Event | File | Record<string, unknown>) {
    const eventRecord = eventOrFile as Record<string, unknown>
    const input =
      'target' in eventRecord
        ? ((eventOrFile as { target?: HTMLInputElement }).target ?? null)
        : null
    const wrappedFile = (eventOrFile as { file?: { originFileObj?: File } | File }).file as
      | { originFileObj?: File }
      | undefined
    const file =
      (typeof File !== 'undefined' && eventOrFile instanceof File ? eventOrFile : null) ||
      ((eventOrFile as { originFileObj?: File }).originFileObj ?? null) ||
      wrappedFile?.originFileObj ||
      ((eventOrFile as { file?: File }).file ?? null) ||
      input?.files?.[0] ||
      null

    datFile.value = file
    form.datWallet = null

    if (!file) {
      form.datPath = t('importJsonWallet.datFile')
      return
    }

    const fileName = input?.value?.split('\\').pop() || file.name
    form.datPath = t('importJsonWallet.selectedDatFile') + fileName

    try {
      const content = await readImportedWalletFile(file)
      const result = parseImportedDatWallet(String(content || ''))
      if (!result.ok) {
        throw new Error(result.errorKey)
      }

      form.datWallet = result.wallet || null
    } catch (error: unknown) {
      form.datWallet = null
      handleWorkflowError({
        error,
        logger,
        context: 'handleImportJsonFileChange',
        errorKey: 'importJsonWallet.invalidDatFile',
      })
    }
  }

  return {
    importAccountForDat,
    handleImportJsonFileChange,
  }
}
