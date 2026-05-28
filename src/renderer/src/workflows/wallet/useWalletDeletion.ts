import { deleteStoredWallet } from '../../modules/wallet/application/walletDetailApplicationService'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import type { WalletAction } from './useWalletExport'

export function useWalletDeletion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: () => Record<string, any>,
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

    if (isCommonWallet()) {
      walletsStore.deleteCommonWallet(wallet().address)
    } else {
      walletsStore.deleteHardwareWallet(wallet().address)
    }

    if (currentWalletStore.wallet.address === wallet().address) {
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
