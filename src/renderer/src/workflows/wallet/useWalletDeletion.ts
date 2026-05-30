import { deleteStoredWallet } from '../../modules/wallet/application/dashboard/walletDetailApplicationService'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import type { WalletAction } from './useWalletExport'

export function useWalletDeletion(
  wallet: () => Record<string, unknown>,
  isCommonWallet: () => boolean,
  openModal: (opt: WalletAction) => void,
  onDeleteDone: () => void
) {
  const loadingStore = useLoadingModalStore()
  const currentWalletStore = useCurrentWalletStore()
  const walletsStore = useWalletsStore()

  function deleteWallet() {
    openModal('TO_DELETE')
  }

  async function handleDelete() {
    const result = await deleteStoredWallet(wallet())
    if (!result.ok) {
      loadingStore.hideLoadingModals()
      notifyError(result.errorKey || 'wallets.deleteFailed')
      return
    }

    const address = String(wallet().address ?? '')
    if (isCommonWallet()) {
      walletsStore.deleteCommonWallet(address)
    } else {
      walletsStore.deleteHardwareWallet(address)
    }

    if (currentWalletStore.wallet.address === address) {
      currentWalletStore.resetCurrentWallet()
    }

    loadingStore.hideLoadingModals()
    notifySuccess('wallets.deleteSucceess')
    onDeleteDone()
  }

  return {
    deleteWallet,
    handleDelete,
  }
}
