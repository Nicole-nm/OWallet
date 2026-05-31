import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useSettingStore } from '../../stores/modules/Setting'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import { useNodeApplyForm } from './useNodeApplyForm'
import { useNodeApplyTransaction } from './useNodeApplyTransaction'
import { useNodeApplyWalletSelection } from './useNodeApplyWalletSelection'

export function useNodeApplyPage() {
  const router = useRouter()
  const walletsStore = useWalletsStore()
  const settingStore = useSettingStore()
  const nodeStakeStore = useNodeStakeStore()
  const nodeSessionStore = useNodeSessionStore()
  const walletSelection = useNodeApplyWalletSelection(walletsStore)
  const form = useNodeApplyForm({
    stakeWallet: walletSelection.stakeWallet,
    getNodePublicKey: walletSelection.getNodePublicKey,
  })
  const transaction = useNodeApplyTransaction({
    router,
    settingStore,
    nodeStakeStore,
    nodeSessionStore,
    stakeWallet: walletSelection.stakeWallet,
    stakeAmount: form.stakeAmount,
    getNodePublicKey: walletSelection.getNodePublicKey,
  })

  onMounted(() => {
    void loadWalletCollectionsIntoStore(walletsStore)
  })

  function back() {
    router.back()
  }

  return {
    ...form,
    ...walletSelection,
    ...transaction,
    back,
  }
}
