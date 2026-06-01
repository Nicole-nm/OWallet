import { ref, shallowRef } from 'vue'

export function useNodeStakeDialogs() {
  const walletPassModal = ref(false)
  const addPosVisible = ref(false)
  const reducePosVisible = ref(false)
  const redeemPosVisible = ref(false)
  const isQuit = ref(false)
  const isDelegateSendTx = ref(true)
  // shallowRef: SDK Transaction class instances stored here must not be
  // wrapped in a deep reactive proxy — identity-sensitive SDK serializers
  // (PublicKey, Address) misbehave when accessed through one.
  const tx = shallowRef<unknown>('')
  const walletPassword = ref('')

  function resetSigningState() {
    tx.value = ''
    walletPassModal.value = false
    isDelegateSendTx.value = true
    isQuit.value = false
    walletPassword.value = ''
  }

  function handleAddPosCancel() {
    addPosVisible.value = false
  }

  function handleReducePosCancel() {
    reducePosVisible.value = false
  }

  function handleRedeemPosCancel() {
    redeemPosVisible.value = false
  }

  return {
    walletPassModal,
    addPosVisible,
    reducePosVisible,
    redeemPosVisible,
    isQuit,
    isDelegateSendTx,
    tx,
    walletPassword,
    resetSigningState,
    handleAddPosCancel,
    handleReducePosCancel,
    handleRedeemPosCancel,
  }
}
