import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import i18n from '../../lang'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { formatTransactionHash } from '../../shared/lib/transactionFeedback'
import {
  notifyError,
  notifySuccess,
  notifyWarning,
  showSuccessModal,
} from '../../shared/ui/feedback'
import { submitWalletRedeem } from '../../modules/wallet/application/transfer/commonRedeemApplicationService'
import { WalletAdapterFactory } from '../../modules/wallet/application/adapter/WalletAdapterFactory'
import type { WalletSigner } from '../../shared/lib/types'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'

export function useCommonRedeemPage() {
  const route = useRoute()
  const router = useRouter()
  const loadingStore = useLoadingModalStore()
  const currentWalletStore = useCurrentWalletStore()

  const password = ref('')
  const interval = ref(1000)
  const sending = ref(false)

  const type = computed(() => route.params.walletType)
  const currentWallet = computed(() => currentWalletStore.wallet)
  const routes = computed(() => [
    { name: currentWallet.value.label, path: ROUTE_PATHS.walletDashboard },
  ])
  const redeem = computed(() => currentWalletStore.redeem)
  const { ledgerConnectorStore, ledgerStatus, ledgerPk } = useLedgerStatusMonitor({
    shouldPoll: computed(() => type.value !== 'commonWallet'),
    interval,
  })

  function goBackToWallets() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function cancelRedeem() {
    router.push(ROUTE_PATHS.walletDashboard)
  }

  async function submit() {
    if (type.value === 'commonWallet' && !password.value) {
      notifyError('commonWalletHome.emptyPass')
      return { ok: false, errorKey: 'commonWalletHome.emptyPass' }
    }
    if (type.value !== 'commonWallet' && !ledgerPk.value) {
      notifyWarning('ledgerWallet.connectApp')
      return { ok: false, errorKey: 'ledgerWallet.connectApp' }
    }

    sending.value = true
    loadingStore.showLoadingModals()
    if (type.value !== 'commonWallet') {
      ledgerConnectorStore.setLedgerStatus(i18n.global.t('common.waitForSign'))
    }

    const adapter = WalletAdapterFactory.fromWalletSigner(currentWallet.value as WalletSigner)
    if (!adapter) {
      loadingStore.hideLoadingModals()
      sending.value = false
      notifyError('common.networkErr')
      return { ok: false, errorKey: 'common.networkErr' }
    }
    const result = await submitWalletRedeem({
      address: currentWallet.value.address,
      adapter,
      claimableOng: redeem.value.claimableOng,
      password: type.value === 'commonWallet' ? password.value : undefined,
    })

    loadingStore.hideLoadingModals()
    sending.value = false

    if (!result.ok) {
      if (result.cancelled) {
        return result
      }

      if (result.errorKey) {
        notifyError(result.errorKey)
      } else if (result.message) {
        notifyError(result.message, { literal: true })
      }

      return {
        ok: false,
        cancelled: result.cancelled,
        errorKey: result.errorKey,
        message: result.message,
      }
    }

    router.push({ path: ROUTE_PATHS.walletDashboard })
    notifySuccess('common.transSentSuccess')
    setTimeout(() => {
      showSuccessModal({
        title: 'common.transSentSuccess',
        content: formatTransactionHash(result.txHash),
      })
    }, 100)
    return { ok: true, txHash: result.txHash }
  }

  return {
    password,
    interval,
    sending,
    type,
    currentWallet,
    routes,
    redeem,
    ledgerStatus,
    ledgerPk,
    goBackToWallets,
    cancelRedeem,
    submit,
  }
}
