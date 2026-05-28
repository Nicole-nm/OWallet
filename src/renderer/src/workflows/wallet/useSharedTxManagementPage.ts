import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { loadLocalSharedCopayers } from '../../modules/wallet/application/sharedWalletOverviewApplicationService'
import type { SharedCopayer } from '../../shared/types'

export function useSharedTxManagementPage() {
  const router = useRouter()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const status = ref('0')
  const localCopayers = ref<SharedCopayer[]>([])
  const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
  const routes = computed(() => [
    { name: sharedWallet.value.sharedWalletName, path: ROUTE_PATHS.sharedWalletHome },
  ])

  onMounted(() => {
    loadLocalCopayers()
  })

  function handleStatusChange(event: Event) {
    status.value = String((event.target as HTMLInputElement | null)?.value || '')
  }

  function handleBack() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  async function loadLocalCopayers() {
    const copayers = sharedWallet.value.coPayers || []
    const result = await loadLocalSharedCopayers(copayers)
    if (result.ok && result.copayers.length > 0) {
      localCopayers.value = result.copayers as unknown as SharedCopayer[]
    }
  }

  return {
    handleBack,
    handleStatusChange,
    localCopayers,
    routes,
    sharedWallet,
    status,
  }
}
