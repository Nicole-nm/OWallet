import { computed, ref } from 'vue'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { handleTransactionFeedback } from '../../shared/lib/transactionFeedback'
import { submitCommonTransfer } from '../../modules/wallet/application/transfer/commonTransferApplicationService'
import { WalletAdapterFactory } from '../../modules/wallet/application/adapter/WalletAdapterFactory'
import type { WalletSigner } from '../../shared/lib/types'

export function useCommonSendConfirmStep() {
  const loadingStore = useLoadingModalStore()
  const currentWalletStore = useCurrentWalletStore()

  const interval = ref(1000)
  const checked = ref(false)
  const password = ref('')
  const sending = ref(false)

  const currentWallet = computed(() => currentWalletStore.wallet)
  const isCommonWallet = computed(() => Boolean(currentWallet.value?.key))
  const transfer = computed(() => currentWalletStore.transfer)
  const { ledgerConnectorStore, ledgerStatus, ledgerPk, pauseMonitoring, startMonitoring } =
    useLedgerStatusMonitor({
      shouldPoll: computed(() => !isCommonWallet.value),
      interval,
    })

  function onChange() {
    checked.value = !checked.value
  }

  async function submit() {
    if (isCommonWallet.value && (!password.value || !checked.value)) {
      notifyWarning('common.confirmPwdTips')
      return { ok: false, errorKey: 'common.confirmPwdTips' }
    }

    if (!isCommonWallet.value && !checked.value) {
      notifyWarning('common.confirmTips')
      return { ok: false, errorKey: 'common.confirmTips' }
    }

    if (!isCommonWallet.value && !ledgerPk.value) {
      notifyWarning('ledgerWallet.connectApp')
      return { ok: false, errorKey: 'ledgerWallet.connectApp' }
    }

    loadingStore.showLoadingModals()
    sending.value = true
    if (!isCommonWallet.value) {
      ledgerConnectorStore.setLedgerStatus('Please sign on Ledger')
    }

    try {
      if (!isCommonWallet.value) {
        await pauseMonitoring()
      }

      const adapter = WalletAdapterFactory.fromWalletSigner(currentWallet.value as WalletSigner)
      if (!adapter) {
        notifyError('common.networkErr')
        return { ok: false, errorKey: 'common.networkErr' }
      }
      const result = await submitCommonTransfer({
        address: currentWallet.value.address,
        adapter,
        transfer: transfer.value,
        password: isCommonWallet.value ? password.value : undefined,
      })

      if (!result.ok) {
        if (result.cancelled) {
          return result
        }

        return handleTransactionFeedback(result, { prependErrorPrefix: false })
      }

      handleTransactionFeedback(result, { prependErrorPrefix: false })
      return result
    } catch {
      const errorKey = isCommonWallet.value ? 'common.networkErr' : 'ledgerWallet.signFailed'
      notifyError(errorKey)
      return { ok: false, errorKey }
    } finally {
      loadingStore.hideLoadingModals()
      sending.value = false
      if (!isCommonWallet.value) {
        startMonitoring()
      }
    }
  }

  return {
    interval,
    checked,
    password,
    sending,
    currentWallet,
    isCommonWallet,
    transfer,
    ledgerStatus,
    ledgerPk,
    onChange,
    submit,
  }
}
