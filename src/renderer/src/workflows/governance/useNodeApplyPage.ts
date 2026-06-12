import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useSettingStore } from '../../stores/modules/Setting'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import { useNodeApplyForm } from './useNodeApplyForm'
import { useNodeApplyTransaction } from './useNodeApplyTransaction'
import { useNodeApplyWalletSelection } from './useNodeApplyWalletSelection'
import { BigNumber } from 'bignumber.js'

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
    ontBalance: walletSelection.ontBalance,
    ongBalance: walletSelection.ongBalance,
    walletType: walletSelection.walletType,
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

  const isOntSufficient = computed(() => {
    return new BigNumber(walletSelection.ontBalance.value).isGreaterThanOrEqualTo(10000)
  })

  const isOngSufficient = computed(() => {
    const requiredGas = walletSelection.walletType.value === 'ledgerWallet' ? 0.5 : 0.1
    const requiredOng = 500 + requiredGas
    return new BigNumber(walletSelection.ongBalance.value).isGreaterThanOrEqualTo(requiredOng)
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
    isOntSufficient,
    isOngSufficient,
    back,
  }
}
