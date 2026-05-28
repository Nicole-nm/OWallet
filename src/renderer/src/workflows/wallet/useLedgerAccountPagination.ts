import { Ref } from 'vue'
import { loadLedgerAccountPage } from '../../modules/wallet/application/ledgerWalletConnectionService'

const LEDGER_ACCOUNT_PAGE_SIZE = 5
const LEDGER_INITIAL_PAGE_RETRY_INTERVAL = 1000

interface LedgerAccountSelection {
  publicKey: string
  acct?: number
  neo?: boolean | number
  address: string
}

interface PaginationForm {
  page: number
  pageSize: number
  publicKeyList: LedgerAccountSelection[]
  isLoading: boolean
  isAdvancedMode: boolean
  initialPageStatus: 'idle' | 'loading' | 'retrying' | 'ready'
}

export { LEDGER_ACCOUNT_PAGE_SIZE, LEDGER_INITIAL_PAGE_RETRY_INTERVAL }
export type { LedgerAccountSelection, PaginationForm }

export function useLedgerAccountPagination(form: PaginationForm, step: Ref<number>) {
  let initialPageRetryTimeoutId: ReturnType<typeof setTimeout> | null = null
  let initialPageLoadToken = 0

  function canAutoLoadInitialLedgerAccounts() {
    return (
      step.value === 2 && !form.isAdvancedMode && form.page === 1 && form.publicKeyList.length === 0
    )
  }

  function clearInitialLedgerPageRetry() {
    if (initialPageRetryTimeoutId !== null) {
      clearTimeout(initialPageRetryTimeoutId)
      initialPageRetryTimeoutId = null
    }
  }

  function stopInitialLedgerPageLoading() {
    initialPageLoadToken += 1
    clearInitialLedgerPageRetry()
    form.initialPageStatus = 'idle'
  }

  function scheduleInitialLedgerPageRetry() {
    clearInitialLedgerPageRetry()
    initialPageRetryTimeoutId = setTimeout(() => {
      initialPageRetryTimeoutId = null
      void loadInitialLedgerAccounts()
    }, LEDGER_INITIAL_PAGE_RETRY_INTERVAL)
  }

  async function requestLedgerAccountPage() {
    return loadLedgerAccountPage({
      page: form.page,
      pageSize: form.pageSize,
      neo: false,
    })
  }

  async function loadInitialLedgerAccounts() {
    if (!canAutoLoadInitialLedgerAccounts() || form.isLoading) {
      return { ok: false, skipped: true }
    }

    clearInitialLedgerPageRetry()

    const requestToken = ++initialPageLoadToken
    form.initialPageStatus = form.initialPageStatus === 'retrying' ? 'retrying' : 'loading'
    form.isLoading = true

    try {
      const result = await requestLedgerAccountPage()
      if (requestToken !== initialPageLoadToken || !canAutoLoadInitialLedgerAccounts()) {
        return result
      }

      form.publicKeyList = result.ok ? result.accounts : []
      if (result.ok) {
        form.initialPageStatus = 'ready'
        return result
      }

      form.initialPageStatus = 'retrying'
      scheduleInitialLedgerPageRetry()
      return result
    } finally {
      form.isLoading = false
    }
  }

  async function getPublicKeyList() {
    stopInitialLedgerPageLoading()
    form.isLoading = true
    try {
      const result = await requestLedgerAccountPage()
      form.publicKeyList = result.ok ? result.accounts : []
      return result
    } finally {
      form.isLoading = false
    }
  }

  function prevImportLedgerPage() {
    if (form.page === 1 || form.isLoading) {
      return
    }

    stopInitialLedgerPageLoading()
    form.page -= 1
    form.publicKeyList = []
    void getPublicKeyList()
  }

  function nextImportLedgerPage() {
    if (form.isLoading) {
      return
    }

    stopInitialLedgerPageLoading()
    form.page += 1
    form.publicKeyList = []
    void getPublicKeyList()
  }

  return {
    loadInitialLedgerAccounts,
    stopInitialLedgerPageLoading,
    getPublicKeyList,
    prevImportLedgerPage,
    nextImportLedgerPage,
  }
}
