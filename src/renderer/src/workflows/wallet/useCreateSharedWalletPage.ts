import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '../../stores/modules/Setting'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import { useWalletsStore } from '../../stores/modules/Wallets'
import {
  createSharedWalletDraft,
  submitSharedWalletCreation,
} from '../../modules/wallet/application/createSharedWalletApplicationService'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { ROUTE_NAMES } from '../../router/routes'
import { applyWalletCollectionsResult } from '../support/walletCollectionsStoreSync'

function createEmptyCopayer() {
  return { name: '', publickey: '', nameValid: true, pkValid: true }
}

type CopayerInput = ReturnType<typeof createEmptyCopayer>

interface CopayerInputChange {
  index: number
  value: string
}

export function useCreateSharedWalletPage() {
  const router = useRouter()
  const settingStore = useSettingStore()
  const walletsStore = useWalletsStore()
  const loadingStore = useLoadingModalStore()
  const currentStep = ref(0)
  const createdLabel = ref('')
  const createdAddress = ref('')
  const copayers = ref<unknown[]>([])
  const requiredSigNum = ref(2)

  const basicLabel = ref('')
  const validLabel = ref(true)
  const pks = ref<CopayerInput[]>([createEmptyCopayer(), createEmptyCopayer()])
  const processing = ref(false)

  const options = computed(() => {
    const items: Array<{ value: number; label: number }> = []
    const length = copayers.value.length || pks.value.length
    for (let index = 2; index <= length; index += 1) {
      items.push({ value: index, label: index })
    }
    return items
  })

  function resetCreateSharedWalletFlow() {
    currentStep.value = 0
    createdLabel.value = ''
    createdAddress.value = ''
    copayers.value = []
    requiredSigNum.value = 2
    basicLabel.value = ''
    validLabel.value = true
    pks.value = [createEmptyCopayer(), createEmptyCopayer()]
    processing.value = false
  }

  function addCreateSharedWalletCopayer() {
    pks.value.push(createEmptyCopayer())
  }

  function removeCreateSharedWalletCopayer(index: number) {
    if (pks.value.length <= 2) {
      notifyError('createSharedWallet.pksLte2')
      return
    }

    const nextPks = pks.value.slice()
    nextPks.splice(index, 1)
    pks.value = nextPks
  }

  function updateCreateSharedWalletCopayerName({ index, value }: CopayerInputChange) {
    if (!pks.value[index]) {
      return
    }

    pks.value[index] = {
      ...pks.value[index],
      name: value,
    }
  }

  function updateCreateSharedWalletCopayerPublicKey({ index, value }: CopayerInputChange) {
    if (!pks.value[index]) {
      return
    }

    pks.value[index] = {
      ...pks.value[index],
      publickey: value,
    }
  }

  function validateCreateSharedWalletLabel() {
    if (!basicLabel.value) {
      validLabel.value = false
      return
    }

    if (basicLabel.value.split('').length > 12) {
      notifyError('createSharedWallet.walletNameErr')
      validLabel.value = false
      return
    }

    validLabel.value = true
  }

  function validateCreateSharedWalletPublicKey({ index, value }: CopayerInputChange) {
    if (!pks.value[index]) {
      return
    }

    pks.value[index] = {
      ...pks.value[index],
      pkValid: !(value && value.length !== 66),
    }
  }

  async function submitCreateSharedWalletBasicStep() {
    const result = await createSharedWalletDraft({
      label: basicLabel.value,
      copayerInputs: pks.value,
    })

    if (!result.ok || !('copayers' in result)) {
      if ('errorKey' in result && result.errorKey) {
        notifyError(result.errorKey)
      }
      return
    }

    createdLabel.value = result.label || ''
    copayers.value = result.copayers
    if (requiredSigNum.value > result.copayers.length) {
      requiredSigNum.value = result.copayers.length
    }
    currentStep.value = 1
  }

  function cancelCreateSharedWalletBasicStep() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function backCreateSharedWalletConfirmStep() {
    currentStep.value = 0
  }

  async function submitCreateSharedWalletConfirmStep() {
    if (processing.value) {
      return
    }

    processing.value = true
    loadingStore.showLoadingModals()

    try {
      const result = await submitSharedWalletCreation({
        network: settingStore.network,
        label: createdLabel.value,
        copayers: copayers.value,
        requiredSigNum: requiredSigNum.value,
      })

      if (!result.ok) {
        notifyError('errorKey' in result ? result.errorKey : 'createSharedWallet.createFailed')
        if ('duplicate' in result && result.duplicate) {
          resetCreateSharedWalletFlow()
          await router.push({ name: ROUTE_NAMES.WALLETS })
        }
        return
      }

      applyWalletCollectionsResult(walletsStore, result.collectionsResult)
      createdAddress.value = result.sharedWalletAddress || ''
      notifySuccess('createSharedWallet.createSuccess')
      resetCreateSharedWalletFlow()
      await router.push({ name: ROUTE_NAMES.WALLETS })
    } finally {
      loadingStore.hideLoadingModals()
      processing.value = false
    }
  }

  onBeforeUnmount(() => {
    resetCreateSharedWalletFlow()
  })

  return {
    ...useWizardPage({
      currentStep,
      backRouteName: ROUTE_NAMES.WALLETS,
      stepTitleKeys: ['createSharedWallet.basicInfo', 'createSharedWallet.copayers'],
    }),
    basicLabel,
    validLabel,
    pks,
    processing,
    createdLabel,
    createdAddress,
    copayers,
    options,
    requiredSigNum,
    addCreateSharedWalletCopayer,
    removeCreateSharedWalletCopayer,
    updateCreateSharedWalletCopayerName,
    updateCreateSharedWalletCopayerPublicKey,
    validateCreateSharedWalletLabel,
    validateCreateSharedWalletPublicKey,
    cancelCreateSharedWalletBasicStep,
    submitCreateSharedWalletBasicStep,
    backCreateSharedWalletConfirmStep,
    submitCreateSharedWalletConfirmStep,
  }
}
