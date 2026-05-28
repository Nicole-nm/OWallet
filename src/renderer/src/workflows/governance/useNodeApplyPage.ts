import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createNodeApplyTransactionDraft,
  createPendingNodeApplyInfo,
  isNodeApplyAmountValid,
  validateNodeApplyForm,
  validateNodeApplyOperationWallet,
} from '../../modules/governance/application/nodeApplyApplicationService'
import { openNodeManagement } from '../../modules/governance/application/managementContextService'
import {
  mapOperationWalletOptions,
  mapStakeWalletOptions,
} from '../../modules/governance/application/walletOptionMapper'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { ROUTE_NAMES } from '../../router/routes'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useSettingStore } from '../../stores/modules/Setting'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { applyManagementContext } from '../support/governanceContextStoreSync'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import type { GovernanceSignablePayload } from './governanceSigningTypes'
import type { HardwareWalletSigner, WalletSigner } from '../../shared/lib/types'

type NodeApplyWallet = WalletSigner & {
  value?: string | number | null
}

type RawWalletSelectOption = {
  address?: string
  publicKey?: string
  key?: string | number
  value?: string | number | null
  label?: string
  acct?: number
  neo?: boolean | number
  timestamp?: number
}

type WalletSelection = {
  wallet: RawWalletSelectOption
  walletType: 'commonWallet' | 'ledgerWallet'
}

function toNodeApplyWallet(selection: WalletSelection): NodeApplyWallet | null {
  const wallet = selection.wallet
  if (!wallet.address) {
    return null
  }

  return selection.walletType === 'commonWallet'
    ? (wallet as NodeApplyWallet)
    : ({
        address: wallet.address,
        label: wallet.label || '',
        publicKey: wallet.publicKey || '',
        acct: wallet.acct,
        neo: wallet.neo,
        timestamp: wallet.timestamp,
      } as HardwareWalletSigner & NodeApplyWallet)
}

export function useNodeApplyPage() {
  const router = useRouter()
  const walletsStore = useWalletsStore()
  const settingStore = useSettingStore()
  const nodeStakeStore = useNodeStakeStore()
  const nodeSessionStore = useNodeSessionStore()

  const current = ref(0)
  const walletType = ref('')
  const stakeWalletValue = ref<string | undefined>(undefined)
  const stakeWallet = ref<NodeApplyWallet | null>(null)
  const operationWallet = ref<string | undefined>(undefined)
  const operationPk = ref('')
  const stakeAmount = ref('')
  const minStakeAmount = ref(10000)
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>(null)
  const registerSucceed = ref(false)
  const validAmount = ref(true)
  const pendingNodePublicKey = ref('')
  const pendingNodeInfoPersisted = ref(false)

  const ledgerList = computed(() => walletsStore.hardwareWallets)
  const stakeWalletOptions = computed(() => {
    const normalList = mapStakeWalletOptions(walletsStore.normalWallets.slice())
    const ledgerWallets = mapStakeWalletOptions(walletsStore.hardwareWallets.slice(), {
      ledger: true,
    })
    return [...normalList, ...ledgerWallets]
  })
  const normalWalletAndLedgerWallet = computed(() => {
    const normalList = mapOperationWalletOptions(walletsStore.normalWallets.slice())
    const ledgerWallets = mapOperationWalletOptions(walletsStore.hardwareWallets.slice())
      .map((wallet) => ({
        ...wallet,
        label: wallet.label + ' ' + wallet.address + ' (Ledger)',
      }))
      .sort((left, right) => {
        const leftTime = left.timestamp || 0
        const rightTime = right.timestamp || 0

        if (rightTime !== leftTime) {
          return rightTime - leftTime
        }

        return (right.acct || 0) - (left.acct || 0)
      })

    return [...normalList, ...ledgerWallets].filter(
      (wallet) => wallet.address !== stakeWallet.value?.address
    )
  })

  onMounted(() => {
    void loadWalletCollectionsIntoStore(walletsStore)
  })

  function back() {
    router.back()
  }

  function onWalletSelected(selection: WalletSelection) {
    const wallet = toNodeApplyWallet(selection)
    if (!wallet) {
      return
    }
    const selectedWalletType = selection.walletType

    walletType.value = selectedWalletType
    stakeWalletValue.value = wallet.address
    stakeWallet.value = wallet
    void onSelectOperationWallet()
  }

  function getNodePublicKey() {
    return operationWallet.value || operationPk.value
  }

  function next() {
    const result = validateNodeApplyForm({
      stakeWalletAddress: stakeWallet.value?.address || '',
      operationWalletPublicKey: getNodePublicKey() || '',
      stakeAmount: stakeAmount.value,
      minStakeAmount: minStakeAmount.value,
      amountIsValid: validAmount.value,
    })

    if (!result.ok) {
      if (result.errorKey) {
        notifyError(result.errorKey)
      }
      return
    }

    current.value += 1
  }

  function cancel() {
    current.value -= 1
  }

  async function onSelectOperationWallet() {
    const stakeWalletAddress = stakeWallet.value?.address
    const operationWalletPublicKey = getNodePublicKey()
    if (!stakeWalletAddress || !operationWalletPublicKey) {
      return
    }

    const result = await validateNodeApplyOperationWallet({
      stakeWalletAddress,
      operationWalletPublicKey,
    })

    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.networkErr')
      operationPk.value = ''
      operationWallet.value = undefined
    }
  }

  async function confirm() {
    const result = await createNodeApplyTransactionDraft({
      stakeWalletAddress: stakeWallet.value?.address || '',
      operationWalletPublicKey: getNodePublicKey(),
      stakeAmount: stakeAmount.value,
    })

    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
      return result
    }

    tx.value = result.tx
    signVisible.value = true
    return result
  }

  function handleTxCancel() {
    signVisible.value = false
    tx.value = null
  }

  async function persistPendingNodeInfo() {
    const nodePk = pendingNodePublicKey.value || getNodePublicKey()
    const result = await createPendingNodeApplyInfo({
      network: settingStore.network,
      stakeWalletAddress: stakeWallet.value?.address || '',
      nodePublicKey: nodePk,
    })

    pendingNodePublicKey.value = result.nodePublicKey || nodePk
    pendingNodeInfoPersisted.value = result.ok

    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
    }

    return result
  }

  async function handleTxSent() {
    registerSucceed.value = true
    await persistPendingNodeInfo()
  }

  async function onComplete() {
    const nodePk = pendingNodePublicKey.value || getNodePublicKey()

    if (!nodePk) {
      notifyError('common.networkErr')
      return
    }

    if (!pendingNodeInfoPersisted.value) {
      await persistPendingNodeInfo()
    }

    const result = openNodeManagement({
      context: {
        stakeWallet: stakeWallet.value,
        nodePublicKey: nodePk,
        activeTab: 3,
      },
    })
    applyManagementContext(nodeSessionStore, nodeStakeStore, result.context)
    await router.push(result.route)
  }

  function onLater() {
    router.push({ name: ROUTE_NAMES.MY_NODE })
  }

  function validateAmount() {
    validAmount.value = isNodeApplyAmountValid(stakeAmount.value)
  }

  return {
    current,
    walletType,
    stakeWalletValue,
    stakeWallet,
    operationWallet,
    operationPk,
    stakeAmount,
    minStakeAmount,
    signVisible,
    tx,
    registerSucceed,
    validAmount,
    ledgerList,
    stakeWalletOptions,
    normalWalletAndLedgerWallet,
    back,
    onWalletSelected,
    next,
    cancel,
    onSelectOperationWallet,
    confirm,
    handleTxCancel,
    handleTxSent,
    onComplete,
    onLater,
    validateAmount,
  }
}
