<template>
  <shared-tx-editor-shell
    form-title-key="sharedTx.addSign"
    signer-title-key="sharedTx.currentSign"
    signer-label-key="sharedTx.selectSigner"
    modal-title-key="sharedTx.addSign"
    :local-signers="localSigners"
    :signer-wallet="signerForView"
    :sign-request="signRequest"
    :modal-open="visible"
    :show-send-button="canSendTx"
    :send-loading="loading"
    @signerChange="handleChangeSigner"
    @txSigned="handleTxSigned"
    @confirm="confirm"
    @copy="handleCopy"
    @send="handleSend"
  >
    <template #formFields>
      <div class="ow-editor-row">
        <p class="ow-editor-label">{{ $t('sharedTx.txContent') }}</p>
        <a-textarea class="ow-editor-control" v-model:value="txbody"></a-textarea>
      </div>
    </template>
  </shared-tx-editor-shell>
</template>

<script setup lang="ts">
import { computed, ref, PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  countSerializedSharedTransactionSignatures,
  sendSerializedSharedTransaction,
} from '../../modules/wallet/application/sharedWalletTransactionApplicationService'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { notifyError, notifySuccess, showSuccessModal } from '../../shared/ui/feedback'
import SharedTxEditorShell from './SharedTxEditorShell.vue'
import { useSharedTxEditor } from './useSharedTxEditor'

defineOptions({
  name: 'SignSharedTx',
})

const props = defineProps({
  localSigners: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
  sharedWallet: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({}),
  },
})

const { t } = useI18n()
const loadingStore = useLoadingModalStore()

const txbody = ref('')
const canSendTx = ref(false)
const loading = ref(false)

const {
  selectedSigner: signer,
  signRequest,
  visible,
  serializedTx,
  handleSignerChange: handleChangeSigner,
  requestSignature,
  openSignedTxModal,
  copySerializedTx,
  resetEditorState,
} = useSharedTxEditor((address: unknown) =>
  props.localSigners.find((item) => (item as { address?: string }).address === address)
)

const signerForView = computed(() => signer.value as never)

function validateForm() {
  return Boolean(txbody.value && signer.value)
}

function confirm() {
  txbody.value = txbody.value.trim()
  if (!validateForm()) {
    notifyError('sharedTx.paramsError')
    return
  }

  requestSignature({
    tx: txbody.value,
    isFirstSign: false,
  })
}

async function handleTxSigned(tx: unknown) {
  const signedCount = await countSerializedSharedTransactionSignatures(String(tx || ''))
  canSendTx.value = signedCount >= Number(props.sharedWallet.requiredNumber || 0)
  openSignedTxModal(tx)
}

async function handleCopy() {
  await copySerializedTx()
  clearData()
}

function clearData() {
  txbody.value = ''
  canSendTx.value = false
  resetEditorState({ resetSigner: true })
}

async function handleSend() {
  loading.value = true
  loadingStore.showLoadingModals()
  const result = await sendSerializedSharedTransaction(serializedTx.value)
  loadingStore.hideLoadingModals()
  loading.value = false

  if (!result.ok) {
    if (result.messageKey) {
      notifyError(result.messageKey)
    } else if (result.message) {
      notifyError(result.message, { literal: true })
    }
    return ''
  }

  notifySuccess('sharedTx.txSentSuccess')
  clearData()
  setTimeout(() => {
    showSuccessModal({
      title: t('common.transSentSuccess'),
      content: 'Transaction hash: ' + result.txHash,
    })
  }, 100)
  return result.txHash
}
</script>
