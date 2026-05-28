<template>
  <shared-tx-editor-shell
    form-title-key="sharedTx.createTx"
    signer-title-key="sharedTx.starterSign"
    signer-label-key="sharedTx.selectSponsor"
    modal-title-key="sharedTx.startTx"
    :local-signers="localSigners"
    :signer-wallet="sponsorPayerForView"
    :sign-request="signRequest"
    :modal-open="visible"
    copy-button-type="primary"
    @signerChange="handleChangeSponsor"
    @txSigned="handleTxSigned"
    @confirm="confirm"
    @copy="handleCopy"
  >
    <template #formFields>
      <div class="ow-editor-row">
        <p class="ow-editor-label">{{ $t('sharedTx.contractHash') }}</p>
        <a-input class="ow-editor-control" v-model:value="contractHash"></a-input>
      </div>
      <div class="ow-editor-row">
        <p class="ow-editor-label">{{ $t('sharedTx.method') }}</p>
        <a-input class="ow-editor-control" v-model:value="method"></a-input>
      </div>
      <div class="ow-editor-row">
        <p class="ow-editor-label">{{ $t('sharedTx.parameters') }}</p>
        <a-textarea class="ow-editor-control" row="3" v-model:value="parameters"></a-textarea>
      </div>
    </template>

    <template #modalBody>
      <p>{{ $t('sharedTx.txSerialized') }}</p>
      <p>{{ serializedTx }}</p>
    </template>
  </shared-tx-editor-shell>
</template>

<script setup lang="ts">
import { computed, ref, PropType } from 'vue'
import { createSerializedSharedInvokeTransaction } from '../../modules/wallet/application/sharedWalletTransactionApplicationService'
import { notifyError } from '../../shared/ui/feedback'
import SharedTxEditorShell from './SharedTxEditorShell.vue'
import { useSharedTxEditor } from './useSharedTxEditor'

defineOptions({
  name: 'StartSharedTx',
})

const props = defineProps({
  sharedWallet: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({}),
  },
  localSigners: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
})

const tx = ref('')
const contractHash = ref('')
const method = ref('')
const parameters = ref('')

const {
  selectedSigner: sponsorPayer,
  signRequest,
  visible,
  serializedTx,
  handleSignerChange: handleChangeSponsor,
  requestSignature,
  openSignedTxModal: handleTxSigned,
  copySerializedTx,
  resetEditorState,
} = useSharedTxEditor((address: unknown) =>
  props.localSigners.find((item) => (item as { address?: string }).address === address)
)

const sponsorPayerForView = computed(() => sponsorPayer.value as never)

function validateForm() {
  contractHash.value = contractHash.value.trim()
  method.value = method.value.trim()

  if (!contractHash.value || !method.value) {
    return false
  }

  if (parameters.value) {
    try {
      const parsed = JSON.parse(parameters.value)
      if (!Array.isArray(parsed)) {
        return false
      }
    } catch {
      return false
    }
  }

  return true
}

async function confirm() {
  if (!validateForm()) {
    notifyError('sharedTx.paramsError')
    return
  }

  try {
    tx.value = await createSerializedSharedInvokeTransaction({
      sharedWalletAddress: String(props.sharedWallet.sharedWalletAddress || ''),
      contractHash: contractHash.value,
      method: method.value,
      parameters: parameters.value,
    })
  } catch {
    notifyError('sharedTx.paramsError')
    return
  }

  requestSignature({
    tx: tx.value,
    isFirstSign: true,
  })
}

async function handleCopy() {
  await copySerializedTx()
  clearData()
}

function clearData() {
  tx.value = ''
  resetEditorState()
}
</script>
