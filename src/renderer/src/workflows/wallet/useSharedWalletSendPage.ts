import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'

export function useSharedWalletSendPage() {
  const router = useRouter()
  const sharedWalletSessionStore = useSharedWalletSessionStore()
  const currentWalletStore = useCurrentWalletStore()

  const current = ref(0)
  const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
  const routes = computed(() => [
    { name: sharedWallet.value.sharedWalletName, path: ROUTE_PATHS.sharedWalletHome },
  ])
  const isRedeem = computed(() => Boolean(currentWalletStore.transfer.isRedeem))

  onMounted(() => {
    current.value = isRedeem.value ? 1 : 0
  })

  function handleRouteBack() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function handleCancel() {
    router.go(-1)
  }

  function handleSendAssetNext() {
    current.value = 1
  }

  function handleSendConfirmNext() {
    current.value = 2
  }

  function handleSendConfirmBack() {
    current.value = 0
  }

  function handleInputPassBack() {
    current.value = 1
  }

  function handleInputPassNext() {
    router.push({ path: ROUTE_PATHS.sharedWalletHome })
  }

  return {
    current,
    handleCancel,
    handleInputPassBack,
    handleInputPassNext,
    handleRouteBack,
    handleSendAssetNext,
    handleSendConfirmBack,
    handleSendConfirmNext,
    isRedeem,
    routes,
  }
}
