import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'

export function useCommonSendPage() {
  const router = useRouter()
  const currentWalletStore = useCurrentWalletStore()

  const currentStep = ref(0)
  const currentWallet = computed(() => currentWalletStore.wallet)
  const routes = computed(() => [
    { name: currentWallet.value.label, path: ROUTE_PATHS.walletDashboard },
  ])

  function goBackToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function cancelCommonSend() {
    router.go(-1)
  }

  function goToCommonSendConfirm() {
    currentStep.value = 1
  }

  function goBackToCommonSendAsset() {
    currentStep.value = 0
  }

  function finishCommonSend() {
    router.go(-1)
  }

  return {
    currentStep,
    currentWallet,
    routes,
    goBackToWallets,
    cancelCommonSend,
    goToCommonSendConfirm,
    goBackToCommonSendAsset,
    finishCommonSend,
  }
}
