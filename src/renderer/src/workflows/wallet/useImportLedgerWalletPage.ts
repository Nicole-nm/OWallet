import { computed, getCurrentInstance, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES } from '../../router/routes'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { notifyWarning } from '../../shared/ui/feedback'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { importLedgerWalletSelections } from '../../modules/wallet/application/ledgerWalletImportService'
import { applyWalletCollectionsResult } from '../support/walletCollectionsStoreSync'
import { useLedgerAccountPagination, LEDGER_ACCOUNT_PAGE_SIZE } from './useLedgerAccountPagination'
import type { LedgerAccountSelection } from './useLedgerAccountPagination'
import { useLedgerAdvancedMode } from './useLedgerAdvancedMode'

interface ImportLedgerForm {
  label: string
  neo: boolean
  page: number
  pageSize: number
  selectedPublicKeys: LedgerAccountSelection[]
  publicKeyList: LedgerAccountSelection[]
  isAdvancedMode: boolean
  isLoading: boolean
  notNeoPathParam: string
  neoPathParam: string
  advancedModeLoading: boolean
  advancedModePublicKey: LedgerAccountSelection | null
  initialPageStatus: 'idle' | 'loading' | 'retrying' | 'ready'
}

type ImportLedgerField = keyof ImportLedgerForm

function toggleElement(array: LedgerAccountSelection[], element: LedgerAccountSelection) {
  const publicKeyArray = array.map((item) => item.publicKey)
  const index = publicKeyArray.indexOf(element.publicKey)
  if (index === -1) {
    array.push(element)
  } else {
    array.splice(index, 1)
  }
}

export function useImportLedgerWalletPage() {
  const router = useRouter()
  const currentWalletStore = useCurrentWalletStore()
  const walletsStore = useWalletsStore()
  const currentStep = ref(0)
  const step = ref(1)
  const ledgerPollInterval = ref(1000)
  const form = reactive<ImportLedgerForm>({
    label: '',
    neo: false,
    page: 1,
    pageSize: LEDGER_ACCOUNT_PAGE_SIZE,
    selectedPublicKeys: [],
    publicKeyList: [],
    isAdvancedMode: false,
    isLoading: false,
    notNeoPathParam: '',
    neoPathParam: '',
    advancedModeLoading: false,
    advancedModePublicKey: null,
    initialPageStatus: 'idle',
  })
  const { ledgerStatus, ledgerPk: publicKey } = useLedgerStatusMonitor({
    shouldPoll: computed(() => step.value === 1),
    interval: ledgerPollInterval,
  })
  const wizard = useWizardPage({
    currentStep,
    backRouteName: ROUTE_NAMES.WALLETS,
    stepCount: 2,
  })
  const addDisabled = computed(() => {
    if (!form.label) {
      return true
    }

    if (!form.isAdvancedMode) {
      return form.selectedPublicKeys.length === 0
    }

    return form.advancedModePublicKey === null
  })

  const pagination = useLedgerAccountPagination(form, step)

  const advancedMode = useLedgerAdvancedMode(
    form,
    pagination.stopInitialLedgerPageLoading,
    pagination.loadInitialLedgerAccounts
  )

  watch(
    () => form.neo,
    () => {
      form.advancedModePublicKey = null
      form.notNeoPathParam = ''
      form.neoPathParam = ''
    }
  )

  async function nextStep() {
    step.value = 2
    currentStep.value = 1
  }

  function openLedgerSupport() {
    openExternalUrl('https://support.ledgerwallet.com/hc/en-us/articles/360007583514')
  }

  function updateImportLedgerField<K extends ImportLedgerField>({
    field,
    value,
  }: {
    field: K
    value: ImportLedgerForm[K]
  }) {
    form[field] = value

    if (field === 'notNeoPathParam' || field === 'neoPathParam') {
      form.advancedModePublicKey = null
      advancedMode.debouncedGetPkForAdvancedMode()
    }
  }

  function selectImportLedgerAddress(selection: LedgerAccountSelection) {
    toggleElement(form.selectedPublicKeys, selection)
  }

  function getAddressFromPubKey(item: LedgerAccountSelection | null | undefined) {
    return item?.address || ''
  }

  async function submitImportLedgerWallet() {
    if (addDisabled.value) {
      notifyWarning('ledgerWallet.pleaseSelectWallet')
      return { ok: false, errorKey: 'ledgerWallet.pleaseSelectWallet' }
    }

    const selections = form.isAdvancedMode
      ? [form.advancedModePublicKey].filter(Boolean)
      : form.selectedPublicKeys
    const result = await importLedgerWalletSelections({
      selections,
      label: form.label,
      neo: form.isAdvancedMode && form.neo,
    })
    const { insertedAccounts, duplicateCount, collectionsResult } = result

    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.savedbFailed')
      return result
    }

    if (duplicateCount > 0) {
      notifyWarning('ledgerWallet.alreadyImported')
    }

    if (insertedAccounts.length > 0) {
      applyWalletCollectionsResult(walletsStore, collectionsResult)
      currentWalletStore.setCurrentWallet({ wallet: insertedAccounts[insertedAccounts.length - 1] })
    }

    await router.push({ name: ROUTE_NAMES.WALLETS })
    return result
  }

  function cancelImportLedgerWallet() {
    pagination.stopInitialLedgerPageLoading()
    return router.push({ name: ROUTE_NAMES.WALLETS })
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      pagination.stopInitialLedgerPageLoading()
    })
  }

  return {
    ...wizard,
    step,
    form,
    ledgerStatus,
    publicKey,
    addDisabled,
    nextStep,
    openLedgerSupport,
    loadInitialLedgerAccounts: pagination.loadInitialLedgerAccounts,
    updateImportLedgerField,
    toggleImportLedgerMode: advancedMode.toggleImportLedgerMode,
    selectImportLedgerAddress,
    getAddressFromPubKey,
    prevImportLedgerPage: pagination.prevImportLedgerPage,
    nextImportLedgerPage: pagination.nextImportLedgerPage,
    submitImportLedgerWallet,
    cancelImportLedgerWallet,
  }
}
