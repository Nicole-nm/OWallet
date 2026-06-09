import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { loadLocalSharedCopayers } from '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService'
import type { SharedCopayer } from '../../shared/types'

export function useCommonReceivePage() {
  const route = useRoute()
  const router = useRouter()
  const currentWalletStore = useCurrentWalletStore()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const walletType = computed(() => route.params.walletType)
  const isCommonWallet = computed(() => walletType.value === 'commonWallet')
  const isSharedWallet = computed(() => !isCommonWallet.value)
  const localCopayerAddresses = ref(new Set<string>())

  const walletContext = computed(() => {
    if (isCommonWallet.value) {
      const wallet = currentWalletStore.wallet
      return {
        walletName: wallet.label,
        routes: [{ name: wallet.label, path: ROUTE_PATHS.walletDashboard }],
        address: wallet.address,
        pk: wallet.publicKey,
      }
    }

    const wallet = sharedWalletSessionStore.wallet
    return {
      walletName: wallet.sharedWalletName,
      routes: [{ name: wallet.sharedWalletName, path: ROUTE_PATHS.sharedWalletHome }],
      address: wallet.sharedWalletAddress,
      pk: '',
    }
  })

  const coPayers = computed<SharedCopayer[]>(() =>
    isSharedWallet.value ? sharedWalletSessionStore.wallet.coPayers || [] : []
  )
  const requiredNumber = computed(() => sharedWalletSessionStore.wallet.requiredNumber)
  const totalNumber = computed(() => sharedWalletSessionStore.wallet.totalNumber)

  onMounted(() => {
    if (isSharedWallet.value) {
      loadLocalCopayers()
    }
  })

  async function loadLocalCopayers() {
    const result = await loadLocalSharedCopayers(sharedWalletSessionStore.wallet.coPayers)
    if (result.ok) {
      const copayers = result.copayers as Array<{ address?: unknown }>
      const addresses = copayers.map((copayer) => String(copayer.address || '')).filter(Boolean)
      localCopayerAddresses.value = new Set(addresses)
    }
  }

  function isLocalCopayer(address: string) {
    return localCopayerAddresses.value.has(address)
  }

  function goBackToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  return {
    walletType,
    isCommonWallet,
    isSharedWallet,
    walletContext,
    coPayers,
    requiredNumber,
    totalNumber,
    isLocalCopayer,
    goBackToWallets,
  }
}
