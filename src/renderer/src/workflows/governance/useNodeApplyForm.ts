import { ref, type Ref } from 'vue'
import {
  isNodeApplyAmountValid,
  validateNodeApplyForm,
} from '../../modules/governance/application/nodeStake/nodeApplyApplicationService'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import type { NodeApplyWallet } from './useNodeApplyWalletSelection'

interface UseNodeApplyFormOptions {
  stakeWallet: Ref<NodeApplyWallet | null>
  getNodePublicKey: () => string | undefined
}

export function useNodeApplyForm({ stakeWallet, getNodePublicKey }: UseNodeApplyFormOptions) {
  const current = ref(0)
  const stakeAmount = ref('')
  const minStakeAmount = ref(10000)
  const validAmount = ref(true)

  function next() {
    const result = validateNodeApplyForm({
      stakeWalletAddress: stakeWallet.value?.address || '',
      operationWalletPublicKey: getNodePublicKey() || '',
      stakeAmount: stakeAmount.value,
      minStakeAmount: minStakeAmount.value,
      amountIsValid: validAmount.value,
    })

    if (notifyFailure(result)) return

    current.value += 1
  }

  function cancel() {
    current.value -= 1
  }

  function validateAmount() {
    validAmount.value = isNodeApplyAmountValid(stakeAmount.value)
  }

  return {
    current,
    stakeAmount,
    minStakeAmount,
    validAmount,
    next,
    cancel,
    validateAmount,
  }
}
