import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createNodeStakeRegistrationDraft,
  loadNodeStakeRegistrationDetail,
  signNodeStakeRegistrationOntid,
  submitNodeStakeRegistration,
} from '../../modules/governance/application/nodeStakeOnboardingApplicationService'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { ROUTE_NAMES } from '../../router/routes'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { isCommonWallet } from '../../shared/lib/types'

function applyStakeDetail(nodeStakeStore: unknown, result: Record<string, unknown>) {
  const store = nodeStakeStore as { setStakeDetail(payload: { detail: unknown }): void }
  store.setStakeDetail({ detail: result.detail })
}

export function useNodeStakeRegisterPage() {
  const router = useRouter()
  const settingStore = useSettingStore()
  const nodeStakeStore = useNodeStakeStore()
  const loadingStore = useLoadingModalStore()

  const stakeQuantity = ref('')
  const ontidPassModal = ref(false)
  const walletPassModal = ref(false)
  const walletModalHandled = ref(false)
  const ontidPassword = ref('')
  const walletPassword = ref('')
  const tx = ref<unknown | null>(null)

  const stakeIdentity = computed(() => nodeStakeStore.stakeIdentity)
  const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
  const detail = computed(() => nodeStakeStore.detail)
  const { ledgerStatus, ledgerWallet } = useLedgerStatusMonitor({
    shouldPoll: computed(() => Boolean(stakeWallet.value && !isCommonWallet(stakeWallet.value))),
  })
  const stakeDetail = computed(() => ({
    ...detail.value,
    ontid: detail.value?.ontid || stakeIdentity.value?.ontid || '',
    stakeWalletAddress: detail.value?.stakeWalletAddress || stakeWallet.value?.address || '',
    publicKey: detail.value?.publicKey || '',
  }))

  onMounted(() => {
    if (stakeIdentity.value?.ontid) {
      void initializeStakeDetail()
    }
  })

  function resetOntidSigningState() {
    ontidPassModal.value = false
    ontidPassword.value = ''
  }

  function resetWalletSigningState() {
    walletPassModal.value = false
    walletModalHandled.value = false
    walletPassword.value = ''
  }

  function resetSigningState() {
    resetOntidSigningState()
    resetWalletSigningState()
    tx.value = null
  }

  function handleRouteBack() {
    router.go(-1)
  }

  async function initializeStakeDetail() {
    const result = await loadNodeStakeRegistrationDetail({
      network: settingStore.network,
      ontid: stakeIdentity.value.ontid,
    })

    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
      return result
    }

    applyStakeDetail(nodeStakeStore, result)
    return result
  }

  async function handleStake() {
    const result = await createNodeStakeRegistrationDraft({
      stakeQuantity: stakeQuantity.value,
      stakeDetail: stakeDetail.value,
    })

    if (!result.ok) {
      notifyError(result.errorKey)
      return result
    }

    tx.value = 'tx' in result ? result.tx : null
    ontidPassModal.value = true
    return result
  }

  async function handleOntidSignOK() {
    if (!tx.value) {
      return
    }

    const result = await signNodeStakeRegistrationOntid({
      tx: tx.value,
      stakeIdentity: stakeIdentity.value,
      password: ontidPassword.value,
    })

    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
      return
    }

    resetOntidSigningState()
    walletPassModal.value = true
  }

  function handleOntidSignCancel() {
    resetOntidSigningState()
  }

  function handleWalletSignCancel() {
    resetWalletSigningState()
  }

  async function handleWalletSignOK() {
    if (walletModalHandled.value) {
      return
    }

    walletModalHandled.value = true

    const wallet = stakeWallet.value
    if (isCommonWallet(wallet) && !walletPassword.value) {
      notifyError('nodeStake.passwordEmpty')
      walletModalHandled.value = false
      return
    }

    if (!tx.value || !stakeIdentity.value || !wallet) {
      walletModalHandled.value = false
      return
    }

    loadingStore.showLoadingModals()

    try {
      const result = await submitNodeStakeRegistration({
        tx: tx.value,
        stakeWallet: wallet,
        ledgerWallet: ledgerWallet.value,
        password: walletPassword.value,
        network: settingStore.network,
        ontid: stakeIdentity.value.ontid,
        publicKey: stakeDetail.value.publicKey,
        stakeWalletAddress: wallet.address,
        stakeQuantity: stakeQuantity.value,
        ledgerConnected: Boolean(ledgerWallet.value?.address),
      })

      if (result.cancelled) {
        walletModalHandled.value = false
        return result
      }

      if (!result.ok) {
        if (result.level === 'warning') {
          notifyWarning(result.errorKey || 'common.networkErr')
        } else {
          notifyError(result.errorKey || 'common.networkErr')
        }

        if ('stage' in result && result.stage === 'submit') {
          walletPassModal.value = false
        }

        return result
      }

      if (result.persistErrorKey) {
        notifyError(result.persistErrorKey)
      }

      resetSigningState()
      await router.push({ name: ROUTE_NAMES.NODE_STAKE_INFO })
      return result
    } finally {
      loadingStore.hideLoadingModals()
      walletModalHandled.value = false
    }
  }

  return {
    stakeQuantity,
    ontidPassModal,
    walletPassModal,
    ontidPassword,
    walletPassword,
    stakeWallet,
    stakeDetail,
    ledgerStatus,
    handleRouteBack,
    handleStake,
    handleOntidSignOK,
    handleOntidSignCancel,
    handleWalletSignOK,
    handleWalletSignCancel,
  }
}
