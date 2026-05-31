import { computed, onMounted, ref, watch } from 'vue'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { hasConfiguredSavePathPreference } from '../../modules/settings/application/settingsPreferencesApplicationService'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import { runRefreshTasks } from '../../shared/lib/refreshHelper'
import { useWalletSearchFilter } from '../../modules/wallet/composables/useWalletSearchFilter'

function sortHardwareWallets<T extends { timestamp?: number; acct?: number }>(wallets: T[] = []) {
  return wallets.slice().sort((left, right) => {
    const rightTimestamp = right.timestamp || 0
    const leftTimestamp = left.timestamp || 0
    if (rightTimestamp !== leftTimestamp) {
      return rightTimestamp - leftTimestamp
    }

    return (right.acct || 0) - (left.acct || 0)
  })
}

export function useWalletsPage() {
  const walletsStore = useWalletsStore()
  const isLoadingWallets = ref(false)
  const walletsErrorKey = ref('')
  const showPathModal = ref(false)
  const filterQuery = ref('')

  const activeTab = computed({
    get() {
      return walletsStore.activeTab
    },
    set(value) {
      walletsStore.setActiveTab(value)
    },
  })

  const { matches } = useWalletSearchFilter(filterQuery)
  const normalWallet = computed(() => walletsStore.normalWallets.filter(matches))
  const sharedWallet = computed(() => walletsStore.sharedWallets.filter(matches))
  const hardwareWalletSort = computed(() =>
    sortHardwareWallets(walletsStore.hardwareWallets).filter(matches)
  )

  const hasWalletLoadError = computed(() => Boolean(walletsErrorKey.value))
  const normalWalletEmpty = computed(() => walletsStore.normalWallets.length === 0)
  const sharedWalletEmpty = computed(() => walletsStore.sharedWallets.length === 0)
  const hardwareWalletEmpty = computed(() => walletsStore.hardwareWallets.length === 0)
  const normalFilteredEmpty = computed(
    () => !normalWalletEmpty.value && normalWallet.value.length === 0
  )
  const sharedFilteredEmpty = computed(
    () => !sharedWalletEmpty.value && sharedWallet.value.length === 0
  )
  const hardwareFilteredEmpty = computed(
    () => !hardwareWalletEmpty.value && hardwareWalletSort.value.length === 0
  )

  watch(activeTab, () => {
    filterQuery.value = ''
  })

  async function ensureSavePath() {
    if (!(await hasConfiguredSavePathPreference())) {
      showPathModal.value = true
    }
  }

  async function reloadWallets(options: { force?: boolean } = { force: true }) {
    walletsErrorKey.value = ''

    const refresh = await runRefreshTasks({
      requestStart: isLoadingWallets,
      tasks: [
        {
          name: 'wallets:reload',
          run: () => loadWalletCollectionsIntoStore(walletsStore, options),
        },
      ],
    })

    if (refresh.skipped) {
      return { ok: false as const, skipped: true, errorKey: 'wallets.loadInProgress' }
    }

    const result = refresh.results[0]
    if (!result || result.status === 'rejected') {
      walletsErrorKey.value = 'wallets.loadFailed'
      return { ok: false as const, errorKey: 'wallets.loadFailed', error: result?.reason }
    }

    if (!result.value.ok) {
      walletsErrorKey.value = result.value.errorKey || 'wallets.loadFailed'
    }

    return result.value
  }

  onMounted(() => {
    void Promise.all([reloadWallets({ force: false }), ensureSavePath()])
  })

  return {
    activeTab,
    filterQuery,
    hardwareWalletEmpty,
    hardwareFilteredEmpty,
    hardwareWalletSort,
    hasWalletLoadError,
    isLoadingWallets,
    normalWalletEmpty,
    normalFilteredEmpty,
    normalWallet,
    reloadWallets,
    sharedWallet,
    sharedWalletEmpty,
    sharedFilteredEmpty,
    showPathModal,
    walletsErrorKey,
  }
}
