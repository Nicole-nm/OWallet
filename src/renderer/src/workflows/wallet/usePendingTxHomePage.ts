import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'

export function usePendingTxHomePage() {
  const router = useRouter()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const showInputPass = ref(false)
  const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
  const routes = computed(() => [
    { name: sharedWallet.value.sharedWalletName, path: ROUTE_PATHS.sharedWalletHome },
  ])
  const currentStep = computed(() => (showInputPass.value ? 1 : 0))
  const progressSteps = [
    { labelKey: 'sharedWalletHome.reviewTransaction' },
    { labelKey: 'sharedWalletHome.signTransaction' },
  ]

  function backToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function handleSignEvent() {
    showInputPass.value = true
  }

  function handleBackEvent() {
    showInputPass.value = false
  }

  function handleSubmitEvent() {
    router.push({ path: ROUTE_PATHS.sharedWalletHome })
  }

  return {
    routes,
    currentStep,
    progressSteps,
    showInputPass,
    backToWallets,
    handleBackEvent,
    handleSignEvent,
    handleSubmitEvent,
  }
}
