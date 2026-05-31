import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { loadLocalSharedCopayers } from '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService'

export function useSharedWalletCopayerPage() {
  const router = useRouter()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
  const localCopayerAddresses = ref(new Set<string>())
  const routes = computed(() => [
    { name: sharedWallet.value.sharedWalletName, path: ROUTE_PATHS.sharedWalletHome },
  ])

  onMounted(() => {
    loadLocalCopayers()
  })

  function backToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  async function loadLocalCopayers() {
    const result = await loadLocalSharedCopayers(sharedWallet.value.coPayers)
    if (result.ok) {
      const copayers = result.copayers as Array<{ address?: unknown }>
      const addresses = copayers.map((copayer) => String(copayer.address || '')).filter(Boolean)
      localCopayerAddresses.value = new Set(addresses)
    }
  }

  function isLocalCopayer(address: string) {
    return localCopayerAddresses.value.has(address)
  }

  return {
    backToWallets,
    isLocalCopayer,
    routes,
    sharedWallet,
  }
}
