import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { POLLING_INTERVAL_MS, TRANSFER_GAS_MIN } from '../../shared/lib/constants'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useClipboardNotice } from '../../shared/composables/useClipboardNotice'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { useWalletDashboard } from './useWalletDashboard'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import {
  checkSharedWalletHasLocalCopayer,
  loadPendingSharedTransfers,
} from '../../modules/wallet/application/sharedWalletOverviewApplicationService'
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
  const { startPolling } = usePollingTask(() => refresh(false), {
    autoStart: false,
    intervalMs: POLLING_INTERVAL_MS,
  })

  onMounted(() => {
    const wallet = {
      address: sharedWallet.value.sharedWalletAddress,
      name: sharedWallet.value.sharedWalletName,
    }
    dashboard.currentWalletStore.mergeCurrentWallet({ wallet })

    refresh(true)
    ifHasLocalCopayer()
    startPolling({ immediate: false })
  })

  function refresh(showLoading: boolean) {
    dashboard.refresh(showLoading, [getPendingTx()])
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

  function toCopayerDetail() {
    router.push({ path: ROUTE_PATHS.sharedWalletCopayers })
  }

  function showTransferBox() {
    if (Number(dashboard.balance.value.ong) < TRANSFER_GAS_MIN) {
      notifyWarning('common.ongNoEnough')
      return
    }
    dashboard.currentWalletStore.resetCurrentTransfer()
    dashboard.currentWalletStore.setTransferRedeemType({ type: false })
    router.push({ path: ROUTE_PATHS.sharedWalletSendTransfer })
  }

  function showReceive() {
    router.push({ path: ROUTE_PATHS.commonReceive('sharedWallet') })
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
    if (Number(dashboard.balance.value.ong) < TRANSFER_GAS_MIN) {
      notifyWarning('common.ongNoEnough')
      return
    }
    dashboard.currentWalletStore.resetCurrentTransfer()
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
    hasLocalCopayer: hasLocalCopayerAvailable,
    pendingTx,
    pendingTxDetail,
    redeemOng,
    refresh,
    sharedWallet,
    showReceive,
    showTransferBox,
    showTxMgmt,
    toCopayerDetail,
  }
}
