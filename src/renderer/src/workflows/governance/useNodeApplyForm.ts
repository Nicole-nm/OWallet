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
  ontBalance: Ref<string>
  ongBalance: Ref<string>
  walletType: Ref<string>
}

export function useNodeApplyForm({
  stakeWallet,
  getNodePublicKey,
  ontBalance,
  ongBalance,
  walletType,
}: UseNodeApplyFormOptions) {
  const current = ref(0)
  const stakeAmount = ref('')
  const minStakeAmount = ref(10000)
  const validAmount = ref(true)

  function next() {
    const price = walletType.value === 'ledgerWallet' ? 2500 : 500
    const limit = 200000 // GAS_LIMIT_HIGH
    const result = validateNodeApplyForm({
      stakeWalletAddress: stakeWallet.value?.address || '',
      operationWalletPublicKey: getNodePublicKey() || '',
      stakeAmount: stakeAmount.value,
      minStakeAmount: minStakeAmount.value,
      amountIsValid: validAmount.value,
      ontBalance: ontBalance.value,
      ongBalance: ongBalance.value,
      gasPrice: price,
      gasLimit: limit,
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
