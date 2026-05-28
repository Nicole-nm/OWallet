import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'

export function useSharedWalletCopayerPage() {
  const router = useRouter()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
  const routes = computed(() => [
    { name: sharedWallet.value.sharedWalletName, path: ROUTE_PATHS.sharedWalletHome },
  ])

  function backToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  return {
    backToWallets,
    routes,
    sharedWallet,
  }
}
