import { ROUTE_NAMES } from '../../../shared/navigation/routeNames'
import { mapAuthorizationCurrentNode } from '../domain/authorizationMapper'
import { applyManagementContext } from './managementContextService'

export function openAuthorizationLogin({ currentNode }: { currentNode: unknown }) {
  const normalizedCurrentNode = mapAuthorizationCurrentNode(currentNode as Record<string, unknown>)

  return {
    ok: true,
    route: { name: ROUTE_NAMES.AUTHORIZE_LOGIN },
    authorizationContext: {
      currentNode: normalizedCurrentNode,
      stakeWallet: '',
    },
  }
}

export function openAuthorizationManagement({
  currentNode,
  stakeWallet,
}: {
  currentNode: unknown
  stakeWallet: unknown
}) {
  const normalizedCurrentNode = mapAuthorizationCurrentNode(currentNode as Record<string, unknown>)
  const managementContextResult = applyManagementContext({
    context: {
      stakeWallet,
      nodePublicKey: normalizedCurrentNode,
      activeTab: 2,
    },
  })

  return {
    ok: true,
    route: { name: ROUTE_NAMES.AUTHORIZATION_MGMT },
    authorizationContext: {
      currentNode: normalizedCurrentNode,
      stakeWallet,
    },
    managementContext: managementContextResult.context,
  }
}
