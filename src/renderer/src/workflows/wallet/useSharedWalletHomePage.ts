import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  POLLING_INTERVAL_MS,
  TRANSFER_GAS_MIN,
  resolveDefaultTransferFee,
} from '../../shared/lib/constants'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useClipboardNotice } from '../../shared/composables/useClipboardNotice'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { useWalletDashboard } from './useWalletDashboard'
import { notifyError, notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import {
  checkSharedWalletHasLocalCopayer,
  checkSharedWalletRegistrationStatus,
  loadPendingSharedTransfers,
  registerSharedWalletOnNetwork,
} from '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService'
import type { PendingSharedTransfer } from '../../shared/types'

export function useSharedWalletHomePage() {
  const router = useRouter()
  const { copyText } = useClipboardNotice()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
  const address = computed(() => sharedWallet.value?.sharedWalletAddress || '')
  const dashboard = useWalletDashboard(address, { filterGovernanceOng: true, txSliceCount: 6 })

  const pendingTx = ref<PendingSharedTransfer[]>([])
  const hasLocalCopayerAvailable = ref(true)
  const registered = ref<boolean | null>(null)
  const registering = ref(false)
  const { startPolling } = usePollingTask(() => refresh(false), {
    autoStart: false,
    intervalMs: POLLING_INTERVAL_MS,
  })

  dashboard.currentWalletStore.resetNativeBalance()
  dashboard.tokensStore.resetOep4Balances()

  onMounted(() => {
    const wallet = {
      address: sharedWallet.value.sharedWalletAddress,
      name: sharedWallet.value.sharedWalletName,
    }
    dashboard.currentWalletStore.mergeCurrentWallet({ wallet })

    refresh(true)
    ifHasLocalCopayer()
    checkRegistration()
    startPolling({ immediate: true })
  })

  watch(
    () => dashboard.settingStore.network,
    () => {
      registered.value = null
      checkRegistration()
    }
  )

  function refresh(showLoading: boolean) {
    return dashboard.refresh(showLoading, [getPendingTx, checkRegistration])
  }

  async function checkRegistration() {
    if (!sharedWallet.value?.sharedWalletAddress) {
      registered.value = null
      return
    }
    const result = await checkSharedWalletRegistrationStatus(
      dashboard.settingStore.network,
      sharedWallet.value.sharedWalletAddress
    )
    registered.value = result.ok ? result.registered : false
  }

  async function handleRegister() {
    if (registering.value) return
    registering.value = true
    try {
      const result = await registerSharedWalletOnNetwork(
        dashboard.settingStore.network,
        sharedWallet.value
      )
      if (!result.ok) {
        notifyError(result.errorKey || 'sharedWalletHome.registerFailed')
        return
      }
      registered.value = true
      notifySuccess('sharedWalletHome.registerSuccess')
    } catch {
      notifyError('sharedWalletHome.registerFailed')
    } finally {
      registering.value = false
    }
  }

  function handleBack() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function getPendingTx() {
    return loadPendingSharedTransfers({
      network: dashboard.settingStore.network,
      sharedWalletAddress: sharedWallet.value.sharedWalletAddress,
    }).then((result) => {
      if (!result.ok) {
        notifyError(result.errorKey || 'common.networkErr')
        return
      }

      pendingTx.value = result.transfers
    })
  }

  async function ifHasLocalCopayer() {
    const result = await checkSharedWalletHasLocalCopayer(sharedWallet.value.coPayers)
    hasLocalCopayerAvailable.value = result.ok ? result.hasLocalCopayer : false
  }

  function showTransferBox() {
    if (Number(dashboard.balance.value.ong) < TRANSFER_GAS_MIN) {
      notifyWarning('common.ongNoEnough')
      return
    }
    dashboard.currentWalletStore.resetCurrentTransfer({
      gas: resolveDefaultTransferFee('shared'),
    })
    dashboard.currentWalletStore.setTransferRedeemType({ type: false })
    router.push({ path: ROUTE_PATHS.sharedWalletSendTransfer })
  }

  function showReceive() {
    router.push({ path: ROUTE_PATHS.receive('sharedWallet') })
  }

  function pendingTxDetail(tx: PendingSharedTransfer) {
    let signed = 0
    for (const copayer of tx.coPayerSignDtos) {
      if (copayer.isSign) {
        signed += 1
      }
    }
    if (Number(sharedWallet.value.requiredNumber) <= signed) {
      notifyWarning('sharedWalletHome.txSendingTochain')
      return
    }
    dashboard.currentWalletStore.setPendingTx({ pendingTx: tx })
    if (tx.receiveaddress === tx.sendaddress && tx.assetName === 'ONG') {
      dashboard.currentWalletStore.setTransferRedeemType({ type: true })
    }
    router.push(ROUTE_PATHS.sharedWalletPendingTxHome)
  }

  async function copy() {
    await copyText(sharedWallet.value.sharedWalletAddress)
  }

  function redeemOng() {
    if (dashboard.balance.value.unboundOng == 0) {
      dashboard.redeemInfoVisible.value = true
      return
    }
    if (Number(dashboard.balance.value.ong) < resolveDefaultTransferFee('shared')) {
      notifyWarning('common.ongNoEnough')
      return
    }
    dashboard.currentWalletStore.resetCurrentTransfer({
      gas: resolveDefaultTransferFee('shared'),
    })
    dashboard.currentWalletStore.setTransferRedeemType({ type: true })
    dashboard.currentWalletStore.setCurrentRedeem({
      redeem: {
        claimableOng: dashboard.balance.value.unboundOng || 0,
        balanceOng: dashboard.balance.value.ong || 0,
      },
    })
    router.push({ path: ROUTE_PATHS.sharedWalletSendTransfer })
  }

  function showTxMgmt() {
    router.push({ path: ROUTE_PATHS.sharedWalletTxMgmt })
  }

  function checkMoreOep4() {
    router.push({ name: ROUTE_NAMES.OEP4_HOME })
  }

  return {
    ...dashboard,
    checkMoreOep4,
    copy,
    handleBack,
    handleRegister,
    hasLocalCopayer: hasLocalCopayerAvailable,
    pendingTx,
    pendingTxDetail,
    redeemOng,
    refresh,
    registered,
    registering,
    sharedWallet,
    showReceive,
    showTransferBox,
    showTxMgmt,
  }
}
