<template>
  <shared-signature-approval-panel
    v-model:checked="checked"
    v-model:password="password"
    :ledger-ready="Boolean(ledgerPk)"
    :ledger-status="ledgerStatus"
    :sending="sending"
    :signer-type="currentSigner.type"
    @back="back"
    @submit="submit"
  ></shared-signature-approval-panel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { submitPendingSharedTransferSignature } from '../../modules/wallet/application/sharedWallet/sharedWalletTransactionApplicationService'
import { notifyError, notifySuccess, showSuccessModal } from '../../shared/ui/feedback'
import { formatTransactionHash } from '../../shared/lib/transactionFeedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import SharedSignatureApprovalPanel from './SharedSignatureApprovalPanel.vue'

defineOptions({
  name: 'PendingTxSign',
})

const emit = defineEmits(['backEvent', 'submitEvent'])
const settingStore = useSettingStore()
const loadingStore = useLoadingModalStore()
const currentWalletStore = useCurrentWalletStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

const pendingTx = computed(() => currentWalletStore.pendingTx)
const currentSigner = computed(() => currentWalletStore.currentSigner)
const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
const password = ref('')
const checked = ref(false)
const sending = ref(false)
const { ledgerStatus, ledgerPk, pauseMonitoring, startMonitoring } = useLedgerStatusMonitor({
  shouldPoll: computed(() => currentSigner.value.type === 'HardwareWallet'),
})

function back() {
  emit('backEvent')
}

async function submit() {
  if (sending.value) {
    return
  }

  const usingLedger = currentSigner.value.type === 'HardwareWallet'
  sending.value = true
  loadingStore.showLoadingModals()

  try {
    if (usingLedger) {
      await pauseMonitoring()
    }

    const result = await submitPendingSharedTransferSignature({
      network: settingStore.network,
      pendingTx: pendingTx.value,
      sharedWallet: sharedWallet.value,
      currentSigner: currentSigner.value,
      password: currentSigner.value.type === 'CommonWallet' ? password.value : undefined,
    })

    if (!result.ok) {
      if (result.cancelled) {
        return
      }
      if (result.errorKey) {
        notifyError(result.errorKey)
      } else if (result.message) {
        notifyError(result.message, { literal: true })
      } else {
        notifyError('common.txFailed')
      }
      return
    }

    if (result.sentToChain) {
      notifySuccess('common.transSentSuccess')
      emit('submitEvent')
      setTimeout(() => {
        showSuccessModal({
          title: 'common.transSentSuccess',
          content: formatTransactionHash(result.txHash),
        })
      }, 100)
      return
    }

    emit('submitEvent')
  } catch {
    notifyError(usingLedger ? 'ledgerWallet.signFailed' : 'common.networkErr')
  } finally {
    loadingStore.hideLoadingModals()
    sending.value = false
    if (usingLedger) {
      startMonitoring()
    }
  }
}
</script>
