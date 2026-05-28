<template>
  <div class="ow-flow-panel clearfix">
    <p class="ow-flow-title">{{ $t('sharedWalletHome.confirmation') }}</p>
    <div class="ow-flow-content">
      <div>
        <a-checkbox @change="onChange" :checked="checked" class="ow-flow-check">{{
          $t('sharedWalletHome.agreeToSend')
        }}</a-checkbox>
        <div v-if="currentSigner.type === 'CommonWallet'">
          <a-input
            type="password"
            class="ow-flow-password"
            :placeholder="$t('sharedWalletHome.inputPassToTransfer')"
            v-model:value="password"
          ></a-input>
        </div>

        <ledger-status-notice
          class="ow-flow-ledger-status"
          v-if="currentSigner.type === 'HardwareWallet'"
          :status="ledgerStatus"
        />
      </div>
      <div class="ow-flow-actions">
        <a-button type="danger" variant="secondary" @click="back">{{
          $t('sharedWalletHome.back')
        }}</a-button>
        <a-button
          type="primary"
          variant="primary"
          @click="submit"
          :disabled="
            sending ||
            !checked ||
            (currentSigner.type === 'CommonWallet' && !password) ||
            (currentSigner.type === 'HardwareWallet' && !ledgerPk)
          "
        >
          {{ $t('sharedWalletHome.submit') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { submitPendingSharedTransferSignature } from '../../modules/wallet/application/sharedWalletTransactionApplicationService'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { notifyError, notifySuccess, showSuccessModal } from '../../shared/ui/feedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'

defineOptions({
  name: 'PendingTxSign',
})

const emit = defineEmits(['backEvent', 'submitEvent'])
const settingStore = useSettingStore()
const loadingStore = useLoadingModalStore()
const currentWalletStore = useCurrentWalletStore()

const pendingTx = computed(() => currentWalletStore.pendingTx)
const currentSigner = computed(() => currentWalletStore.currentSigner)
const password = ref('')
const checked = ref(false)
const sending = ref(false)
const { ledgerStatus, ledgerPk } = useLedgerStatusMonitor({
  shouldPoll: computed(() => currentSigner.value.type === 'HardwareWallet'),
})

function back() {
  emit('backEvent')
}

function onChange() {
  checked.value = !checked.value
}

async function submit() {
  if (sending.value) {
    return
  }

  sending.value = true
  loadingStore.showLoadingModals()
  const result = await submitPendingSharedTransferSignature({
    network: settingStore.network,
    pendingTx: pendingTx.value,
    currentSigner: currentSigner.value,
    password: currentSigner.value.type === 'CommonWallet' ? password.value : undefined,
  })
  loadingStore.hideLoadingModals()
  sending.value = false

  if (!result.ok) {
    if (result.cancelled) {
      return
    }
    if (result.messageKey) {
      notifyError(result.messageKey)
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
        content: 'Transaction hash: ' + result.txHash,
      })
    }, 100)
    return
  }

  emit('submitEvent')
}
</script>
