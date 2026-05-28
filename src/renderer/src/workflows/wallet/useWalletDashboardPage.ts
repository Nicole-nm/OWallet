import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { POLLING_INTERVAL_MS, TRANSFER_GAS_MIN } from '../../shared/lib/constants'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useClipboardNotice } from '../../shared/composables/useClipboardNotice'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { useWalletDashboard } from './useWalletDashboard'
import { notifyWarning } from '../../shared/ui/feedback'

export function useWalletDashboardPage() {
  const router = useRouter()
  const { copyText } = useClipboardNotice()
  const address = computed(() => dashboard.currentWalletStore.wallet.address)
  const dashboard = useWalletDashboard(address)

  const currentWallet = computed(() => dashboard.currentWalletStore.wallet)
  const { startPolling } = usePollingTask(() => dashboard.refresh(false), {
    autoStart: false,
    intervalMs: POLLING_INTERVAL_MS,
  })

  dashboard.currentWalletStore.resetNativeBalance()
  dashboard.tokensStore.resetOep4Balances()

  onMounted(() => {
    dashboard.refresh(true)
    startPolling({ immediate: false })
  })

  function handleBack() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function sendAsset() {
    if (Number(dashboard.balance.value.ong) < TRANSFER_GAS_MIN) {
      notifyWarning('common.ongNoEnough')
      return
    }

    dashboard.currentWalletStore.resetCurrentTransfer()
    router.push({ name: ROUTE_NAMES.COMMON_SEND_HOME })
  }

  function commonReceive() {
    router.push({ path: ROUTE_PATHS.commonReceive('commonWallet') })
  }

  function redeemOng() {
    if (dashboard.balance.value.unboundOng == 0) {
      dashboard.redeemInfoVisible.value = true
      return
    }

    const redeem = {
      claimableOng: dashboard.balance.value.unboundOng || 0,
      balanceOng: dashboard.balance.value.ong || 0,
      balance: dashboard.balance.value.ong,
    }

    dashboard.currentWalletStore.setCurrentRedeem({ redeem })
    if (currentWallet.value.key) {
      router.push({ path: ROUTE_PATHS.commonRedeem('commonWallet') })
      return
    }

    router.push({ path: ROUTE_PATHS.commonRedeem('hardwareWallet') })
  }

  async function copy(value: unknown) {
    await copyText(String(value || ''))
  }

  return {
    ...dashboard,
    address,
    currentWallet,
    handleBack,
    sendAsset,
    commonReceive,
    redeemOng,
    copy,
  }
}
