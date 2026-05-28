import { computed, onMounted } from 'vue'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useAppUpdateStore } from '../../stores/modules/AppUpdate'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'

export function useHomePage() {
  const walletsStore = useWalletsStore()
  const appUpdateStore = useAppUpdateStore()

  const version = computed(() => appUpdateStore.currentVersion)
  const latestVersion = computed(() => appUpdateStore.latestVersion)
  const hasUpdate = computed(() => appUpdateStore.hasUpdate)

  function primeWallets() {
    void loadWalletCollectionsIntoStore(walletsStore)
  }

  function handleUpdate() {
    if (!appUpdateStore.releaseUrl) {
      return
    }

    openExternalUrl(appUpdateStore.releaseUrl)
  }

  onMounted(() => {
    primeWallets()
  })

  return {
    hasUpdate,
    latestVersion,
    version,
    handleUpdate,
    primeWallets,
  }
}
