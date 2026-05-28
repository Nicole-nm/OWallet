import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'

export function useCommonReceivePage() {
  const route = useRoute()
  const router = useRouter()
  const currentWalletStore = useCurrentWalletStore()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const walletType = computed(() => route.params.walletType)
  const isCommonWallet = computed(() => walletType.value === 'commonWallet')
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

  function goBackToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  return {
    walletType,
    isCommonWallet,
    walletContext,
    goBackToWallets,
  }
}
