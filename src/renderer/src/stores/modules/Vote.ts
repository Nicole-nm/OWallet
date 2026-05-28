import { defineStore } from 'pinia'
import type { WalletSigner } from '../../shared/lib/types'
import type { GovernanceVoteRecord, GovernanceVoter, VoteTopic } from '../../shared/types'

export const VOTE_STATUS_TEXT = {
  NOT_START: 'NOT_START',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
  CANCELED: 'CANCELED',
}

export const MY_VOTED = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NOT_VOTED: 'NOT_VOTED',
}

export const useVoteStore = defineStore('Vote', {
  state: () => ({
    contractHash: '',
    voteWallet: null as WalletSigner | null,
    voteWalletType: '',
    role: [] as string[],
    allVotes: [] as VoteTopic[],
    adminVotes: [] as VoteTopic[],
    currentVote: {} as VoteTopic | Record<string, unknown>,
    myWeight: 0,
    allVoters: [] as GovernanceVoter[],
    currentVoteRecords: [] as GovernanceVoteRecord[],
  }),
  actions: {
    setContractHash(contractHash = '') {
      this.contractHash = contractHash || ''
    },
    setVoteWallet(voteWallet: WalletSigner | null = null) {
      this.voteWallet = voteWallet || null
    },
    setVoteRole(role: string[] = []) {
      this.role = Array.isArray(role) ? role : []
    },
    setVoteWalletType(type = '') {
      this.voteWalletType = type || ''
    },
    setCurrentVote(vote: VoteTopic | Record<string, unknown> = {}) {
      this.currentVote = vote || {}
    },
    setMyWeight(weight = 0) {
      this.myWeight = weight || 0
    },
    setAllVotes(votes: VoteTopic[] = []) {
      this.allVotes = Array.isArray(votes) ? votes : []
    },
    setAdminVotes(votes: VoteTopic[] = []) {
      this.adminVotes = Array.isArray(votes) ? votes : []
    },
    setAllVoters(voters: GovernanceVoter[] = []) {
      this.allVoters = Array.isArray(voters) ? voters : []
    },
    setVoteRecords(records: GovernanceVoteRecord[] = []) {
      this.currentVoteRecords = Array.isArray(records) ? records : []
    },
    resetCurrentVoteRecords() {
      this.currentVoteRecords = []
    },
  },
})
