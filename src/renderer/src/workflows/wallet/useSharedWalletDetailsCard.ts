import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { deleteStoredSharedWallet } from '../../modules/wallet/application/dashboard/walletDetailApplicationService'
import { useCopyFeedback } from '../../shared/composables/useCopyFeedback'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { ROUTE_PATHS } from '../../router/routes'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import type { SharedWalletSession } from '../../shared/types'

export function useSharedWalletDetailsCard() {
  const router = useRouter()
  const loadingStore = useLoadingModalStore()
  const sharedWalletSessionStore = useSharedWalletSessionStore()
  const walletsStore = useWalletsStore()
  const { copied, copyText } = useCopyFeedback()

  const addressCopied = ref(false)
  const showModal = ref(false)

  watch(copied, (value) => {
    addressCopied.value = value
  })

  function toSharedWalletHome(wallet: SharedWalletSession): void {
    sharedWalletSessionStore.setSharedWallet(wallet)
    router.push({ path: ROUTE_PATHS.sharedWalletHome })
  }

  async function copyAddress(wallet: SharedWalletSession): Promise<void> {
    await copyText(String(wallet.sharedWalletAddress || ''))
  }

  function openDeleteModal(): void {
    showModal.value = true
  }

  function closeDeleteModal(): void {
    showModal.value = false
  }

  async function handleDelete(address: string): Promise<void> {
    loadingStore.showLoadingModals()
    const result = await deleteStoredSharedWallet(address)
    if (!result.ok) {
      loadingStore.hideLoadingModals()
      notifyError(result.errorKey || 'wallets.deleteFailed')
      return
    }

    walletsStore.deleteSharedWallet(address)
    notifySuccess('wallets.deleteSucceess')
    showModal.value = false
    loadingStore.hideLoadingModals()
  }

  return {
    addressCopied,
    showModal,
    toSharedWalletHome,
    copyAddress,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  }
}
