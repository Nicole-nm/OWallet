type GovernanceContext = Record<string, unknown>

interface NodeAuthorizationStoreLike {
  setCurrentNode(payload: { currentNode: unknown }): void
  setStakeAuthorizationWallet(payload: { stakeWallet: unknown }): void
}

interface NodeSessionStoreLike {
  selectNodeContext(payload: {
    stakeWallet: unknown
    nodePublicKey: unknown
    status: unknown
  }): void
  setActiveManagementTab(tab: unknown): void
}

interface NodeStakeStoreLike {
  setStakeWallet(payload: { stakeWallet: unknown }): void
  setNodePublicKey(payload: { nodePublicKey: unknown }): void
  setNodeStatus(payload: { status: unknown }): void
}

export function applyAuthorizationContext(
  nodeAuthorizationStore: unknown,
  context: GovernanceContext = {}
) {
  const store = nodeAuthorizationStore as NodeAuthorizationStoreLike
  store.setCurrentNode({ currentNode: context.currentNode })
  store.setStakeAuthorizationWallet({ stakeWallet: context.stakeWallet || '' })
}

export function applyManagementContext(
  nodeSessionStore: unknown,
  nodeStakeStore: unknown,
  context: GovernanceContext = {}
) {
  const sessionStore = nodeSessionStore as NodeSessionStoreLike
  const stakeStore = nodeStakeStore as NodeStakeStoreLike
  sessionStore.selectNodeContext({
    stakeWallet: context.stakeWallet,
    nodePublicKey: context.nodePublicKey,
    status: context.status,
  })
  sessionStore.setActiveManagementTab(context.activeTab)
  stakeStore.setStakeWallet({ stakeWallet: context.stakeWallet || { address: '', key: '' } })
  stakeStore.setNodePublicKey({ nodePublicKey: context.nodePublicKey || '' })
  stakeStore.setNodeStatus({ status: context.status || '' })
}
