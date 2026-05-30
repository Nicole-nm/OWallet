import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { openAuthorizationManagement } from '../../modules/governance/application/authorization/authorizationContextService'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import {
  applyAuthorizationContext,
  applyManagementContext,
} from '../support/governanceContextStoreSync'
import { useStakeWalletSelection } from './useStakeWalletSelection'

export function useAuthorizationLoginPage() {
  const router = useRouter()
  const nodeAuthStore = useNodeAuthorizationStore()
  const nodeStakeStore = useNodeStakeStore()
  const nodeSessionStore = useNodeSessionStore()
  const selection = useStakeWalletSelection()

  async function initializePage() {
    await selection.ensureWalletsLoaded()
    selection.restoreSelectedWallet(nodeAuthStore.stakeAuthorizationWallet)
  }

  function submit() {
    const stakeWallet = selection.resolveSelectedWallet()
    if (!stakeWallet) {
      return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    const result = openAuthorizationManagement({
      currentNode: nodeAuthStore.currentNode,
      stakeWallet,
    })
    applyAuthorizationContext(nodeAuthStore, result.authorizationContext)
    applyManagementContext(nodeSessionStore, nodeStakeStore, result.managementContext)
    router.push(result.route)

    return { ok: true }
  }

  function handleRouteBack() {
    router.go(-1)
  }

  function handleChangePayer(selectionPayload: { wallet?: { address?: string } }) {
    selection.setSelectedWalletByAddress(selectionPayload.wallet?.address || '')
  }

  function next() {
    const result = submit()
    notifyFailure(result, 'common.networkErr')
    return result
  }

  onMounted(() => {
    void initializePage()
  })

  onBeforeUnmount(() => {
    selection.cleanupSelection()
  })

  return {
    ...selection,
    handleRouteBack,
    handleChangePayer,
    next,
    initializeAuthorizationLoginPage: initializePage,
    submitAuthorizationLogin: submit,
  }
}
