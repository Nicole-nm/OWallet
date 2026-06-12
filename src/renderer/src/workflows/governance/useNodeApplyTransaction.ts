import { ref, type Ref } from 'vue'
import type { Router } from 'vue-router'
import {
  createNodeApplyTransactionDraft,
  createPendingNodeApplyInfo,
  validateNodeApplyRegistrationInput,
} from '../../modules/governance/application/nodeStake/nodeApplyApplicationService'
import { openNodeManagement } from '../../modules/governance/application/nodeStake/managementContextService'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { notifyError } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { ROUTE_NAMES } from '../../router/routes'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useSettingStore } from '../../stores/modules/Setting'
import { applyManagementContext } from '../support/governanceContextStoreSync'
import { useGovernanceSignAndSend } from './useGovernanceSignAndSend'
import type { NodeApplyWallet } from './useNodeApplyWalletSelection'

interface UseNodeApplyTransactionOptions {
  router: Router
  settingStore: ReturnType<typeof useSettingStore>
  nodeStakeStore: ReturnType<typeof useNodeStakeStore>
  nodeSessionStore: ReturnType<typeof useNodeSessionStore>
  stakeWallet: Ref<NodeApplyWallet | null>
  stakeAmount: Ref<string>
  getNodePublicKey: () => string | undefined
}

export function useNodeApplyTransaction({
  router,
  settingStore,
  nodeStakeStore,
  nodeSessionStore,
  stakeWallet,
  stakeAmount,
  getNodePublicKey,
}: UseNodeApplyTransactionOptions) {
  const registerSucceed = ref(false)
  const pendingNodePublicKey = ref('')
  const pendingNodeInfoPersisted = ref(false)
  const { walletPassword, usesCommonWallet, ledgerStatus, ensureSignerReady, signAndSend } =
    useGovernanceSignAndSend({ wallet: () => stakeWallet.value })

  async function confirm() {
    if (!ensureSignerReady()) {
      return { ok: false as const }
    }

    const stakeWalletAddress = stakeWallet.value?.address || ''
    const operationWalletPublicKey = getNodePublicKey() || ''
    const validationResult = await validateNodeApplyRegistrationInput({
      network: settingStore.network,
      stakeWalletAddress,
      operationWalletPublicKey,
    })

    if (!validationResult.ok) {
      notifyFailure(validationResult, 'common.networkErr')
      return validationResult
    }

    const result = await createNodeApplyTransactionDraft({
      stakeWalletAddress,
      operationWalletPublicKey,
      stakeAmount: stakeAmount.value,
    })

    if (notifyFailure(result, 'common.networkErr')) return result

    const signResult = await signAndSend(result.tx)

    if (!signResult.ok) {
      return signResult
    }

    await handleTxSent()
    return { ok: true as const }
  }

  async function persistPendingNodeInfo() {
    const nodePk = pendingNodePublicKey.value || getNodePublicKey() || ''
    const result = await createPendingNodeApplyInfo({
      network: settingStore.network,
      stakeWalletAddress: stakeWallet.value?.address || '',
      nodePublicKey: nodePk,
    })

    pendingNodePublicKey.value = result.nodePublicKey || nodePk || ''
    pendingNodeInfoPersisted.value = result.ok

    notifyFailure(result, 'common.networkErr')

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

  return {
    walletPassword,
    usesCommonWallet,
    ledgerStatus,
    registerSucceed,
    pendingNodePublicKey,
    pendingNodeInfoPersisted,
    confirm,
    handleTxSent,
    onComplete,
    onLater,
  }
}
