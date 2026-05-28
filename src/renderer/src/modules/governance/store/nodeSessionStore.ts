import { defineStore } from 'pinia'
import { normalizeNodePublicKey } from '../domain/nodeMapper'

export const useNodeSessionStore = defineStore('GovernanceNodeSession', {
  state: () => ({
    selectedStakeWallet: null as unknown,
    selectedNodePublicKey: '',
    selectedStatus: '',
    activeManagementTab: 1,
  }),
  actions: {
    selectNodeContext(node: Record<string, unknown> = {}) {
      this.selectedStakeWallet = node.stakeWallet || null
      this.selectedNodePublicKey = normalizeNodePublicKey(node)
      this.selectedStatus = String(node.status ?? '')
    },
    setActiveManagementTab(tabIndex = 1) {
      this.activeManagementTab = tabIndex
    },
    clearNodeContext() {
      this.selectedStakeWallet = null
      this.selectedNodePublicKey = ''
      this.selectedStatus = ''
      this.activeManagementTab = 1
    },
  },
})
