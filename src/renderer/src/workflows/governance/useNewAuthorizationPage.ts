import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { notifyError } from '../../shared/ui/feedback'
import {
  createNewAuthorizationTransaction,
  resolveNewAuthorizationInput,
} from '../../modules/governance/application/authorizationManagementApplicationService'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

export function useNewAuthorizationPage() {
  const router = useRouter()
  const nodeAuthStore = useNodeAuthorizationStore()
  const nodeStakeStore = useNodeStakeStore()

  const units = ref(1)
  const amount = ref(1)
  const validInput = ref(true)
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')

  const currentNode = computed(() => nodeAuthStore.currentNode)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)

  function setUnits(nextUnits: unknown) {
    units.value = Number(nextUnits || 0)
    const result = resolveNewAuthorizationInput({
      units: units.value,
      currentNode: currentNode.value,
    })

    amount.value = result.amount
    validInput.value = result.validInput
    return validInput.value
  }

  function closeSignDialog() {
    signVisible.value = false
    tx.value = ''
  }

  function handleRouteBack() {
    router.go(-1)
  }

  function handleChange() {
    return setUnits(units.value)
  }

  function handleCancel() {
    closeSignDialog()
  }

  function handleTransactionSent() {
    signVisible.value = false
    tx.value = ''
    router.go(-1)
  }

  function handleTxSent() {
    handleTransactionSent()
  }

  async function submitNewAuthorization() {
    const wallet = stakeWallet.value
    if (!wallet?.address) {
      return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    const input = resolveNewAuthorizationInput({
      units: units.value,
      currentNode: currentNode.value,
    })
    amount.value = input.amount
    validInput.value = input.validInput

    if (!input.ok) {
      return { ok: false, errorKey: input.errorKey }
    }

    const result = await createNewAuthorizationTransaction({
      currentNode: currentNode.value,
      stakeWalletAddress: wallet.address,
      amount: input.amount,
    })
    if (!result.ok) {
      return result
    }

    tx.value = result.tx
    signVisible.value = true
    return { ok: true }
  }

  async function submit() {
    const result = await submitNewAuthorization()
    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
    }
    return result
  }

  return {
    currentNode,
    stakeWallet,
    units,
    amount,
    validInput,
    signVisible,
    tx,
    handleRouteBack,
    handleChange,
    handleCancel,
    handleTxSent,
    setUnits,
    closeSignDialog,
    handleTransactionSent,
    submitNewAuthorization,
    submit,
  }
}
