import { ROUTE_NAMES } from '../../../shared/navigation/routeNames'
import { normalizeNodePublicKey } from '../domain/nodeMapper'

function normalizeManagementContext(context: Record<string, unknown> = {}) {
  return {
    stakeWallet: context.stakeWallet || null,
    nodePublicKey: normalizeNodePublicKey(
      context.nodePublicKey || context.node || context.currentNode || ''
    ),
    status: context.status ?? '',
    activeTab: Number(context.activeTab || 1),
  }
}

export function applyManagementContext({
  context = {},
}: { context?: Record<string, unknown> } = {}) {
  return {
    ok: true,
    context: normalizeManagementContext(context),
  }
}

export function syncManagementContextFromSession({
  sessionContext = {},
  fallbackContext = {},
}: { sessionContext?: Record<string, unknown>; fallbackContext?: Record<string, unknown> } = {}) {
  const hasSessionContext = Boolean(sessionContext.stakeWallet && sessionContext.nodePublicKey)

  if (hasSessionContext) {
    return applyManagementContext({
      context: sessionContext,
    })
  }

  return applyManagementContext({
    context: fallbackContext,
  })
}

export function openNodeManagement({ context = {} }: { context?: Record<string, unknown> } = {}) {
  const result = applyManagementContext({ context })
  return {
    ok: true,
    route: { name: ROUTE_NAMES.NODE_STAKE_MANAGEMENT },
    context: result.context,
  }
}
