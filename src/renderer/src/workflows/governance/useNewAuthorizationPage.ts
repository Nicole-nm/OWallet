import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import {
  createNewAuthorizationTransaction,
  resolveNewAuthorizationInput,
} from '../../modules/governance/application/authorization/authorizationManagementApplicationService'
import { useGovernanceSignAndSend } from './useGovernanceSignAndSend'

export function useNewAuthorizationPage() {
  const router = useRouter()
  const nodeAuthStore = useNodeAuthorizationStore()
  const nodeStakeStore = useNodeStakeStore()

  const units = ref(1)
  const amount = ref(1)
  const validInput = ref(true)

  const currentNode = computed(() => nodeAuthStore.currentNode)
  const currentNodeDisplay = computed(() => ({
    ...currentNode.value,
    maxAuthorizeDisplay: formatNumberForDisplay(currentNode.value.maxAuthorizeStr),
    totalPosDisplay: formatNumberForDisplay(currentNode.value.totalPosStr),
  }))
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const { walletPassword, usesCommonWallet, ledgerStatus, ensureSignerReady, signAndSend } =
    useGovernanceSignAndSend({ wallet: () => stakeWallet.value })

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

  function handleRouteBack() {
    router.go(-1)
  }

  function handleChange() {
    return setUnits(units.value)
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

    return { ok: true as const, tx: result.tx }
  }

  async function submit() {
    if (!ensureSignerReady()) {
      return { ok: false as const }
    }

    const result = await submitNewAuthorization()
    if (!result.ok) {
      notifyFailure(result, 'common.networkErr')
      return result
    }

    const signResult = await signAndSend(result.tx)
    if (signResult.ok) {
      router.go(-1)
    }
    return signResult
  }

  return {
    currentNode,
    currentNodeDisplay,
    stakeWallet,
    units,
    amount,
    validInput,
    walletPassword,
    usesCommonWallet,
    ledgerStatus,
    handleRouteBack,
    handleChange,
    setUnits,
    submitNewAuthorization,
    submit,
  }
}
