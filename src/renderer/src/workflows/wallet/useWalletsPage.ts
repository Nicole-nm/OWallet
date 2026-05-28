import { computed, onMounted, ref } from 'vue'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { hasConfiguredSavePathPreference } from '../../modules/settings/application/settingsPreferencesApplicationService'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'

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

  const normalWallet = computed(() => walletsStore.normalWallets)
  const sharedWallet = computed(() => walletsStore.sharedWallets)
  const hardwareWallet = computed(() => walletsStore.hardwareWallets)
  const activeTab = computed({
    get() {
      return walletsStore.activeTab
    },
    set(value) {
      walletsStore.setActiveTab(value)
    },
  })
  const hardwareWalletSort = computed(() => sortHardwareWallets(hardwareWallet.value))
  const hasWalletLoadError = computed(() => Boolean(walletsErrorKey.value))
  const normalWalletEmpty = computed(() => normalWallet.value.length === 0)
  const sharedWalletEmpty = computed(() => sharedWallet.value.length === 0)
  const hardwareWalletEmpty = computed(() => hardwareWalletSort.value.length === 0)

  async function ensureSavePath() {
    if (!(await hasConfiguredSavePathPreference())) {
      showPathModal.value = true
    }
  }

  async function reloadWallets(options: { force?: boolean } = { force: true }) {
    isLoadingWallets.value = true
    walletsErrorKey.value = ''

    try {
      const result = await loadWalletCollectionsIntoStore(walletsStore, options)
      if (!result.ok) {
        walletsErrorKey.value = result.errorKey || 'wallets.loadFailed'
      }
      return result
    } finally {
      isLoadingWallets.value = false
    }
  }

  onMounted(() => {
    void Promise.all([reloadWallets({ force: false }), ensureSavePath()])
  })

  return {
    activeTab,
    hardwareWalletEmpty,
    hardwareWalletSort,
    hasWalletLoadError,
    isLoadingWallets,
    normalWalletEmpty,
    normalWallet,
    reloadWallets,
    sharedWallet,
    sharedWalletEmpty,
    showPathModal,
    walletsErrorKey,
  }
}
