import { ref } from 'vue'
import { useClipboardNotice } from '../../shared/composables/useClipboardNotice'

interface SignatureRequest {
  nonce: number
  isFirstSign: boolean
  tx: unknown
}

interface SignatureRequestInput {
  tx: unknown
  isFirstSign: boolean
}

export function useSharedTxEditor(resolveSigner: unknown) {
  const signerResolver = resolveSigner as (address: unknown) => unknown
  const selectedSigner = ref<unknown>('')
  const signRequest = ref<SignatureRequest | null>(null)
  const visible = ref(false)
  const serializedTx = ref('')
  const { copyText } = useClipboardNotice()

  function handleSignerChange(address: unknown) {
    selectedSigner.value = signerResolver(address) || ''
  }

  function requestSignature({ tx, isFirstSign }: SignatureRequestInput) {
    signRequest.value = {
      nonce: Date.now(),
      isFirstSign,
      tx,
    }
  }

  function openSignedTxModal(nextTx: unknown) {
    serializedTx.value = String(nextTx || '')
    visible.value = true
  }

  async function copySerializedTx() {
    await copyText(serializedTx.value)
  }

  function resetEditorState({ resetSigner = false } = {}) {
    if (resetSigner) {
      selectedSigner.value = ''
    }

    signRequest.value = null
    serializedTx.value = ''
    visible.value = false
  }

  return {
    selectedSigner,
    signRequest,
    visible,
    serializedTx,
    handleSignerChange,
    requestSignature,
    openSignedTxModal,
    copySerializedTx,
    resetEditorState,
  }
}
