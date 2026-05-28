import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '../../stores/modules/Setting'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { notifyError, notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import {
  persistImportedSharedWallet,
  queryImportableSharedWallet,
} from '../../modules/wallet/application/importSharedWalletApplicationService'
import { useWizardPage } from '../../shared/composables/useWizardPage'
import { ROUTE_NAMES } from '../../router/routes'
import { applyWalletCollectionsResult } from '../support/walletCollectionsStoreSync'

export function useImportSharedWalletPage() {
  const router = useRouter()
  const settingStore = useSettingStore()
  const walletsStore = useWalletsStore()
  const loadingStore = useLoadingModalStore()
  const currentStep = ref(0)
  const sharedWallet = ref<Record<string, unknown> | null>({})
  const searchText = ref('')

  function resetImportSharedWalletFlow() {
    currentStep.value = 0
    sharedWallet.value = {}
    searchText.value = ''
  }

  function cancelImportSharedWalletQueryStep() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  async function submitImportSharedWalletQueryStep() {
    loadingStore.showLoadingModals()

    try {
      const result = await queryImportableSharedWallet({
        network: settingStore.network,
        sharedWalletAddress: searchText.value,
      })

      if (!result.ok) {
        sharedWallet.value = null
        notifyError(result.errorKey || 'importSharedWallet.notFound')
        return
      }

      sharedWallet.value = result.wallet || null
      currentStep.value = 1
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  function backImportSharedWalletConfirmStep() {
    currentStep.value = 0
  }

  async function submitImportSharedWalletConfirmStep() {
    const result = await persistImportedSharedWallet(sharedWallet.value || {})

    if (result.ok) {
      applyWalletCollectionsResult(walletsStore, result.collectionsResult)
      notifySuccess('importSharedWallet.success')
    } else if ('duplicate' in result && result.duplicate) {
      notifyWarning(result.errorKey || 'importSharedWallet.duplicate')
    } else {
      notifyError(result.errorKey || 'common.savedbFailed')
    }

    resetImportSharedWalletFlow()
    await router.push({ name: ROUTE_NAMES.WALLETS })
  }

  onBeforeUnmount(() => {
    resetImportSharedWalletFlow()
  })

  return {
    ...useWizardPage({
      currentStep,
      backRouteName: ROUTE_NAMES.WALLETS,
      stepCount: 2,
    }),
    searchText,
    sharedWallet: computed(() => sharedWallet.value),
    cancelImportSharedWalletQueryStep,
    submitImportSharedWalletQueryStep,
    backImportSharedWalletConfirmStep,
    submitImportSharedWalletConfirmStep,
  }
}
