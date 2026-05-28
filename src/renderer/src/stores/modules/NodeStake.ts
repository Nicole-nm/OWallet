import { defineStore } from 'pinia'
import { Identity, type WalletSigner } from '../../shared/lib/types'
import type { StakeDetail } from '../../shared/types'

function createEmptyStakeDetail(): StakeDetail {
  return {
    pk: '',
    peerPubkey: '',
    publicKey: '',
    nodePublicKey: '',
    name: '',
    nodeAddress: '',
    ontid: '',
    contract: '',
    stakeWalletAddress: '',
    commitmentQuantity: 0,
    transactionHash: '',
    status: 0,
  }
}

function createEmptyStakeIdentity(): Identity {
  return {
    ontid: '',
    label: '',
    controls: [],
  }
}

export interface NodeStakeState {
  detail: ReturnType<typeof createEmptyStakeDetail>
  nodePublicKey: string
  stakeWallet: WalletSigner | null
  stakeIdentity: Identity
  nodeStatus: string
}

export const useNodeStakeStore = defineStore('NodeStake', {
  state: (): NodeStakeState => ({
    detail: createEmptyStakeDetail(),
    nodePublicKey: '',
    stakeWallet: null,
    stakeIdentity: createEmptyStakeIdentity(),
    nodeStatus: '',
  }),
  actions: {
    setStakeIdentity(payload: { stakeIdentity?: Identity } = {}) {
      this.stakeIdentity = payload.stakeIdentity || createEmptyStakeIdentity()
    },
    setStakeWallet(payload: { stakeWallet?: WalletSigner } = {}) {
      this.stakeWallet = payload.stakeWallet || null
    },
    setNodePublicKey(payload: { nodePublicKey?: string } = {}) {
      this.nodePublicKey = payload.nodePublicKey ?? ''
    },
    setNodeStatus(payload: { status?: string } = {}) {
      this.nodeStatus = payload.status ?? ''
    },
    setStakeDetail(payload: { detail?: StakeDetail } = {}) {
      this.detail = payload.detail || createEmptyStakeDetail()
    },
  },
})
