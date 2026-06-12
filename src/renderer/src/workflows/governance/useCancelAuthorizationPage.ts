import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import {
  createCancelAuthorizationTransaction,
  validateCancelAuthorizationAmount,
} from '../../modules/governance/application/authorization/authorizationManagementApplicationService'
import { useGovernanceSignAndSend } from './useGovernanceSignAndSend'

export function useCancelAuthorizationPage() {
  const router = useRouter()
  const nodeAuthStore = useNodeAuthorizationStore()
  const nodeStakeStore = useNodeStakeStore()

  const cancelAmount = ref<number | string>(0)
  const validCancelAmount = ref(true)

  const currentNode = computed(() => nodeAuthStore.currentNode)
  const authorizationInfo = computed(() => nodeAuthStore.authorizationInfo)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)

  const { walletPassword, usesCommonWallet, ledgerStatus, ensureSignerReady, signAndSend } =
    useGovernanceSignAndSend({ wallet: () => stakeWallet.value })

  function validateCancelAmount() {
    const result = validateCancelAuthorizationAmount({
      cancelAmount: cancelAmount.value,
      authorizationInfo: authorizationInfo.value,
    })
    validCancelAmount.value = result.validCancelAmount
    return validCancelAmount.value
  }

  function handleRouteBack() {
    router.go(-1)
  }

  function handleChange() {
    return validateCancelAmount()
  }

  async function submitCancelAuthorization() {
    const wallet = stakeWallet.value
    if (!wallet?.address) {
      return { ok: false as const, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    const result = await createCancelAuthorizationTransaction({
      currentNode: currentNode.value,
      stakeWalletAddress: wallet.address,
      cancelAmount: cancelAmount.value,
      authorizationInfo: authorizationInfo.value,
    })
    if (!result.ok) {
      validCancelAmount.value = false
      return result
    }

    return { ok: true as const, tx: result.tx }
  }

  async function submit() {
    if (!ensureSignerReady()) return

    const built = await submitCancelAuthorization()
    if (!built.ok) {
      notifyFailure(built, 'common.networkErr')
      return
    }

    const result = await signAndSend(built.tx)
    if (result.ok) {
      router.go(-1)
    }
  }

  return {
    currentNode,
    authorizationInfo,
    stakeWallet,
    cancelAmount,
    validCancelAmount,
    walletPassword,
    usesCommonWallet,
    ledgerStatus,
    handleRouteBack,
    handleChange,
    validateCancelAmount,
    submitCancelAuthorization,
    submit,
  }
}
