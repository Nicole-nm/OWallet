import _ from 'lodash'
import { loadLedgerAccountSelection } from '../../modules/wallet/application/ledgerWalletConnectionService'
import type { LedgerAccountSelection } from './useLedgerAccountPagination'

interface AdvancedModeForm {
  neo: boolean
  isAdvancedMode: boolean
  notNeoPathParam: string
  neoPathParam: string
  advancedModeLoading: boolean
  advancedModePublicKey: LedgerAccountSelection | null
  publicKeyList: LedgerAccountSelection[]
}

export function useLedgerAdvancedMode(
  form: AdvancedModeForm,
  stopInitialLedgerPageLoading: () => void,
  loadInitialLedgerAccounts: () => Promise<unknown>
) {
  async function getPkForAdvancedMode() {
    try {
      form.advancedModeLoading = true
      const acctText = form.neo ? form.neoPathParam : form.notNeoPathParam
      const acct = Number(acctText || 0)
      const result = await loadLedgerAccountSelection({
        acct,
        neo: form.neo,
      })
      form.advancedModePublicKey = result.ok && result.selection ? result.selection : null
    } finally {
      form.advancedModeLoading = false
    }
  }

  const debouncedGetPkForAdvancedMode = _.debounce(getPkForAdvancedMode, 500)

  function toggleImportLedgerMode() {
    stopInitialLedgerPageLoading()
    form.isAdvancedMode = !form.isAdvancedMode
    form.advancedModePublicKey = null

    if (!form.isAdvancedMode && form.publicKeyList.length === 0) {
      void loadInitialLedgerAccounts()
    }
  }

  return {
    debouncedGetPkForAdvancedMode,
    toggleImportLedgerMode,
  }
}
