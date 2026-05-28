import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { getExplorerTxPageUrl, getExplorerAddressPageUrl } from '../../shared/lib/urlBuilder'
import { notifyError, notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useSettingStore } from '../../stores/modules/Setting'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useOep4sStore } from '../../stores/modules/Oep4s'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import {
  createTrackedOep4Token,
  loadTrackedOep4Balances,
  loadTrackedOep4Transactions,
} from '../../modules/wallet/application/oep4PortfolioApplicationService'
import { logger } from '../../shared/lib/logger'

export function useOep4HomePage() {
  const router = useRouter()
  const settingStore = useSettingStore()
  const currentWalletStore = useCurrentWalletStore()
  const oep4sStore = useOep4sStore()
  const loadingStore = useLoadingModalStore()
  const sharedWalletSessionStore = useSharedWalletSessionStore()

  const showModal = ref(false)
  const scriptHash = ref('')
  const net = computed(() => settingStore.network)
  const currentWallet = computed(() => currentWalletStore.wallet)
  const address = computed(() => currentWalletStore.wallet.address || '')
  const oep4s = computed(() => oep4sStore.oep4s)
  const completedTx = computed(() => oep4sStore.completedTx)
  const isSharedWallet = computed(
    () => sharedWalletSessionStore.wallet?.sharedWalletAddress === address.value
  )
  const routes = computed(() => [
    {
      name: currentWallet.value.name || currentWallet.value.label,
      path: isSharedWallet.value ? ROUTE_PATHS.sharedWalletHome : ROUTE_PATHS.walletDashboard,
    },
  ])

  onMounted(() => {
    refresh()
  })

  async function refresh() {
    const [balancesResult, transactionsResult] = await Promise.all([
      loadTrackedOep4Balances({
        oep4s: oep4s.value,
        address: address.value,
        network: net.value,
      }),
      loadTrackedOep4Transactions({
        address: address.value,
        oep4s: oep4s.value,
        network: net.value,
      }),
    ])

    if (!balancesResult.ok || !transactionsResult.ok) {
      notifyError('common.networkErr')
      return
    }

    oep4sStore.setPortfolio({
      oep4s: balancesResult.balances,
      completedTx: transactionsResult.transactions,
    })
  }

  function handleBack() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function handleAdd() {
    showModal.value = true
  }

  function handleCancel() {
    showModal.value = false
    scriptHash.value = ''
  }

  function handleAddOep4() {
    if (!scriptHash.value || scriptHash.value.trim().length !== 40) {
      notifyError('commonWalletHome.invalidScriptHash')
      return
    }

    const existingScriptHashes = new Set(
      oep4s.value.map((o) => String(o.scriptHash || o.contractHash || ''))
    )
    if (existingScriptHashes.has(scriptHash.value)) {
      notifyWarning('commonWalletHome.oep4Exists')
      return
    }

    loadingStore.showLoadingModals()
    createTrackedOep4Token({
      scriptHash: scriptHash.value,
      address: address.value,
      network: net.value,
    })
      .then(async (result) => {
        if (result.ok) {
          oep4sStore.addOep4(result.token)
          const transactionsResult = await loadTrackedOep4Transactions({
            address: address.value,
            oep4s: [...oep4sStore.oep4s],
            network: net.value,
          })
          if (transactionsResult.ok) {
            oep4sStore.setCompletedTx(transactionsResult.transactions)
          }
          showModal.value = false
          scriptHash.value = ''
          notifySuccess('commonWalletHome.addOep4Success')
        } else {
          notifyError(result.errorKey || 'common.networkErr')
        }
        loadingStore.hideLoadingModals()
      })
      .catch((error) => {
        logger.error('useOep4HomePage.handleAddOep4', error)
        loadingStore.hideLoadingModals()
        notifyError('common.networkErr')
      })
  }

  function sendAsset() {
    currentWalletStore.resetCurrentTransfer()
    if (isSharedWallet.value) {
      currentWalletStore.setTransferRedeemType({ type: false })
      router.push({ path: ROUTE_PATHS.sharedWalletSendTransfer })
      return
    }

    router.push({ name: ROUTE_NAMES.COMMON_SEND_HOME })
  }

  function commnReceive() {
    router.push({
      path: ROUTE_PATHS.commonReceive(isSharedWallet.value ? 'sharedWallet' : 'commonWallet'),
    })
  }

  function showTxDetail(txHash: unknown) {
    openExternalUrl(getExplorerTxPageUrl(String(txHash || ''), net.value))
  }

  function checkMoreTx() {
    openExternalUrl(getExplorerAddressPageUrl(address.value, net.value))
  }

  return {
    Breadcrumb,
    address,
    checkMoreTx,
    commnReceive,
    completedTx,
    currentWallet,
    handleAdd,
    handleAddOep4,
    handleBack,
    handleCancel,
    net,
    oep4s,
    refresh,
    routes,
    scriptHash,
    sendAsset,
    showModal,
    showTxDetail,
  }
}
