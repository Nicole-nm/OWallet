import { createRouter, createWebHashHistory } from 'vue-router'
import { routes, ROUTE_NAMES } from './routes'
import { useWalletsStore } from '../stores/modules/Wallets'
import { useCurrentWalletStore } from '../stores/modules/CurrentWallet'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const PUBLIC_ROUTES = new Set<string | symbol | null | undefined>([
  ROUTE_NAMES.HOME,
  ROUTE_NAMES.SETTING,
])

router.beforeEach((to) => {
  if (PUBLIC_ROUTES.has(to.name) || !to.name) {
    return true
  }

  if (to.meta.requiresCurrentWallet) {
    const currentWalletStore = useCurrentWalletStore()
    if (!currentWalletStore.wallet?.address) {
      return { name: ROUTE_NAMES.WALLETS }
    }
  }

  if (to.meta.requiresWalletCollection) {
    const walletsStore = useWalletsStore()
    if (!walletsStore.hasLoadedWallets) {
      return { name: ROUTE_NAMES.HOME }
    }
  }

  return true
})

export * from './routes'
export default router
