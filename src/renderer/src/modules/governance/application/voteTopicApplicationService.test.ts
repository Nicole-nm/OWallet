import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  voteDomain: {
    getContractHashFallback: vi.fn(),
    queryGovNodes: vi.fn(),
    queryTopicHashes: vi.fn(),
    queryTopicInfos: vi.fn(),
    queryOldTopicInfos: vi.fn(),
    queryTopicInfo: vi.fn(),
    buildVoteTx: vi.fn(),
    buildCancelTopicTx: vi.fn(),
    buildCreateTopicTx: vi.fn(),
    setVotersAndSend: vi.fn(),
    queryVoters: vi.fn(),
    queryVotedInfo: vi.fn(),
    queryVotedRecords: vi.fn(),
    fetchCurrentStakes: vi.fn(),
  },
  nodeStakeService: {
    fetchVoteContractAddress: vi.fn(),
  },
  walletService: {
    deriveAddressFromPublicKey: vi.fn(),
  },
}))

vi.mock('../../../domains/governance/voteApplicationService', () => ({
  getContractHashFallback: (...args: any[]) => mocks.voteDomain.getContractHashFallback(...args),
  queryGovNodes: (...args: any[]) => mocks.voteDomain.queryGovNodes(...args),
  queryTopicHashes: (...args: any[]) => mocks.voteDomain.queryTopicHashes(...args),
  queryTopicInfos: (...args: any[]) => mocks.voteDomain.queryTopicInfos(...args),
  queryOldTopicInfos: (...args: any[]) => mocks.voteDomain.queryOldTopicInfos(...args),
  queryTopicInfo: (...args: any[]) => mocks.voteDomain.queryTopicInfo(...args),
  buildVoteTx: (...args: any[]) => mocks.voteDomain.buildVoteTx(...args),
  buildCancelTopicTx: (...args: any[]) => mocks.voteDomain.buildCancelTopicTx(...args),
  buildCreateTopicTx: (...args: any[]) => mocks.voteDomain.buildCreateTopicTx(...args),
  setVotersAndSend: (...args: any[]) => mocks.voteDomain.setVotersAndSend(...args),
  queryVoters: (...args: any[]) => mocks.voteDomain.queryVoters(...args),
  queryVotedInfo: (...args: any[]) => mocks.voteDomain.queryVotedInfo(...args),
  queryVotedRecords: (...args: any[]) => mocks.voteDomain.queryVotedRecords(...args),
  fetchCurrentStakes: (...args: any[]) => mocks.voteDomain.fetchCurrentStakes(...args),
}))

vi.mock('../../../domains/nodeStake/applicationService', () => ({
  fetchVoteContractAddress: (...args: any[]) =>
    mocks.nodeStakeService.fetchVoteContractAddress(...args),
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  deriveAddressFromPublicKey: (...args: any[]) =>
    mocks.walletService.deriveAddressFromPublicKey(...args),
}))

import {
  createVoteDecisionTransaction,
  loadVoteDetail,
  loadVoteList,
  loadVoteRole,
  resolveVoteContractHash,
  syncAdminVotes,
} from './voteTopicApplicationService'
import type { WalletSigner } from '../../../shared/lib/types'

interface TestVoteStore {
  contractHash: string
  voteWallet: WalletSigner
  allVotes: Array<Record<string, any>>
  allVoters: Array<Record<string, any>>
}

function createVoteStore(): TestVoteStore {
  return {
    contractHash: '',
    voteWallet: { address: 'AQ123' },
    allVotes: [],
    allVoters: [],
  }
}

describe('voteTopicApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.voteDomain.getContractHashFallback.mockReturnValue('fallback-hash')
    mocks.nodeStakeService.fetchVoteContractAddress.mockResolvedValue({
      vote_contract_address: 'resolved-hash',
    })
    mocks.voteDomain.fetchCurrentStakes.mockResolvedValue([
      { publicKey: 'pk-1', name: 'Node 1', currentStake: 25 },
    ])
    mocks.walletService.deriveAddressFromPublicKey.mockResolvedValue('AQ123')
  })

  it('resolves and caches the vote contract hash', async () => {
    const voteStore = createVoteStore()

    await expect(
      resolveVoteContractHash({ contractHash: voteStore.contractHash, network: 'MAIN_NET' })
    ).resolves.toMatchObject({
      ok: true,
      contractHash: 'resolved-hash',
    })
  })

  it('loads voter role and weight from governance voters', async () => {
    const voteStore = createVoteStore()
    mocks.voteDomain.queryGovNodes.mockResolvedValue([{ address: 'AQ123', weight: 0 }])

    await expect(
      loadVoteRole({ contractHash: voteStore.contractHash, network: 'MAIN_NET', address: 'AQ123' })
    ).resolves.toEqual({
      ok: true,
      contractHash: 'resolved-hash',
      role: ['VOTER', 'ADMIN'],
      allVoters: [{ address: 'AQ123', weight: 25, name: 'Node 1' }],
      myWeight: 25,
    })
  })

  it('loads vote list and falls back to old contract topics when needed', async () => {
    const voteStore = createVoteStore()
    mocks.voteDomain.queryTopicHashes.mockResolvedValue(['hash-1', 'hash-2'])
    mocks.voteDomain.queryTopicInfos.mockResolvedValue([{ hash: 'hash-1', title: 'New vote' }])
    mocks.voteDomain.queryOldTopicInfos.mockResolvedValue([{ hash: 'hash-2', title: 'Old vote' }])

    await expect(
      loadVoteList({ contractHash: voteStore.contractHash, network: 'MAIN_NET' })
    ).resolves.toEqual({
      ok: true,
      contractHash: 'resolved-hash',
      votes: [
        { hash: 'hash-1', title: 'New vote' },
        { hash: 'hash-2', title: 'Old vote' },
      ],
    })
    expect(mocks.voteDomain.queryOldTopicInfos).toHaveBeenCalledWith('MAIN_NET', ['hash-2'])
  })

  it('syncs admin votes from the current wallet address', () => {
    const voteStore = createVoteStore()
    voteStore.allVotes = [
      { hash: '1', admin: 'AQ123' },
      { hash: '2', admin: 'AQ999' },
    ]

    expect(
      syncAdminVotes({ allVotes: voteStore.allVotes, address: voteStore.voteWallet.address })
    ).toEqual({
      ok: true,
      votes: [{ hash: '1', admin: 'AQ123' }],
    })
  })

  it('loads vote detail and annotates records with voter names', async () => {
    const voteStore = createVoteStore()
    voteStore.contractHash = 'resolved-hash'
    voteStore.allVoters = [{ address: 'AQ123', name: 'Node 1' }]
    mocks.voteDomain.queryVotedInfo.mockResolvedValue('APPROVED')
    mocks.voteDomain.queryTopicInfo.mockResolvedValue({ hash: 'hash-1', title: 'Vote 1' })
    mocks.voteDomain.queryVotedRecords.mockResolvedValue([
      { address: 'AQ123', weight: 25, isApproval: true },
    ])

    await expect(
      loadVoteDetail({
        contractHash: voteStore.contractHash,
        network: 'MAIN_NET',
        hash: 'hash-1',
        address: 'AQ123',
        voteWallet: voteStore.voteWallet,
        allVoters: voteStore.allVoters,
      })
    ).resolves.toEqual({
      ok: true,
      contractHash: 'resolved-hash',
      myVoted: 'APPROVED',
      isVoter: true,
      currentVote: { hash: 'hash-1', title: 'Vote 1' },
      votedRecords: [{ address: 'AQ123', weight: 25, isApproval: true, name: 'Node 1' }],
    })
  })

  it('builds a stop-vote transaction after resolving the contract hash', async () => {
    const voteStore = createVoteStore()
    mocks.voteDomain.buildVoteTx.mockResolvedValue('vote-tx')

    await expect(
      createVoteDecisionTransaction({
        contractHash: voteStore.contractHash,
        network: 'MAIN_NET',
        hash: 'hash-1',
        approve: true,
        voteWallet: voteStore.voteWallet,
      })
    ).resolves.toEqual({
      ok: true,
      contractHash: 'resolved-hash',
      tx: 'vote-tx',
    })

    expect(mocks.voteDomain.buildVoteTx).toHaveBeenCalledWith(
      'resolved-hash',
      'hash-1',
      'AQ123',
      true
    )
  })
})
