import {
  fetchCurrentStakes,
  queryGovNodes,
  queryOldTopicInfos,
  queryTopicHashes,
  queryTopicInfo,
  queryTopicInfos,
  queryVotedInfo,
  queryVotedRecords,
  queryVoters,
} from '../../../domains/governance/voteApplicationService'
import { tryCatch } from '../../../shared/lib/result'
import type { GovernanceVoteRecord, ServiceResult, VoteTopic } from '../../../shared/types'
import type { NetworkId, WalletSigner } from '../../../shared/lib/types'
import {
  buildStakeAddressMap,
  buildVoteRoleFromVoter,
  getRequiredVoteContractHash,
  mapGovernanceVoters,
  mapVoteRecords,
  NETWORK_ERROR_KEY,
  normalizeVoteVoters,
  resolveVoteAddress,
  type NetworkFailure,
  type VoteVoterRecord,
  voteTopicLogger,
} from './voteTopicShared'

export async function loadVoteRole({
  contractHash = '',
  network,
  address,
}: {
  contractHash?: string
  network: NetworkId
  address: string
}): Promise<
  ServiceResult<
    {
      contractHash: string
      role: string[]
      allVoters: VoteVoterRecord[]
      myWeight: number
    },
    NetworkFailure
  >
> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const [stakesResponse, voters] = await Promise.all([
        fetchCurrentStakes(network),
        queryGovNodes(resolvedContractHash),
      ])
      const stakeAddressMap = await buildStakeAddressMap(
        Array.isArray(stakesResponse) ? stakesResponse : []
      )
      const allVoters = mapGovernanceVoters(voters as unknown[], stakeAddressMap)
      const currentVoter = allVoters.find((item) => item.address === address)
      const role = buildVoteRoleFromVoter(currentVoter)
      const myWeight = currentVoter?.weight ?? 0
      return { contractHash: resolvedContractHash, role, allVoters, myWeight }
    },
    { context: 'loadVoteRole', errorKey: NETWORK_ERROR_KEY, logger: voteTopicLogger }
  ) as Promise<
    ServiceResult<
      { contractHash: string; role: string[]; allVoters: VoteVoterRecord[]; myWeight: number },
      NetworkFailure
    >
  >
}

export async function loadVoteList({
  contractHash = '',
  network,
}: {
  contractHash?: string
  network: NetworkId
}): Promise<ServiceResult<{ contractHash: string; votes: VoteTopic[] }, NetworkFailure>> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const hashes = await queryTopicHashes(resolvedContractHash)
      let votes: unknown[] = await queryTopicInfos(resolvedContractHash, hashes)

      const oldHashes = hashes.filter(
        (hash: string) => !votes.some((vote) => (vote as { hash?: string }).hash === hash)
      )
      if (oldHashes.length > 0) {
        const oldVotes = await queryOldTopicInfos(network, oldHashes)
        votes = votes.concat(oldVotes)
      }

      return { contractHash: resolvedContractHash, votes: votes as VoteTopic[] }
    },
    { context: 'loadVoteList', errorKey: NETWORK_ERROR_KEY, logger: voteTopicLogger }
  ) as Promise<ServiceResult<{ contractHash: string; votes: VoteTopic[] }, NetworkFailure>>
}

export function syncAdminVotes({
  allVotes = [],
  address,
}: {
  allVotes?: Array<Record<string, unknown>>
  address?: string
}) {
  const votes = address ? allVotes.filter((item) => item?.admin === address) : []
  return { ok: true, votes }
}

export async function loadVoteVoters({
  contractHash = '',
  network,
  hash,
}: {
  contractHash?: string
  network: NetworkId
  hash: string
}): Promise<
  ServiceResult<
    { contractHash: string; voters: VoteVoterRecord[] },
    NetworkFailure & { voters: VoteVoterRecord[] }
  >
> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const voters = await queryVoters(resolvedContractHash, hash)
      return { contractHash: resolvedContractHash, voters: voters as VoteVoterRecord[] }
    },
    {
      context: 'loadVoteVoters',
      errorKey: NETWORK_ERROR_KEY,
      logger: voteTopicLogger,
      onFailure: () => ({ voters: [] as VoteVoterRecord[] }),
    }
  ) as Promise<
    ServiceResult<
      { contractHash: string; voters: VoteVoterRecord[] },
      NetworkFailure & { voters: VoteVoterRecord[] }
    >
  >
}

export function isVoteVoter({
  allVoters = [],
  address,
}: {
  allVoters?: unknown[]
  address: string
}) {
  return normalizeVoteVoters(allVoters).some((item) => item.address === address)
}

export async function loadVoteDetail({
  contractHash = '',
  network,
  hash,
  address,
  voteWallet,
  allVoters = [],
}: {
  contractHash?: string
  network: NetworkId
  hash: string
  address?: string
  voteWallet?: WalletSigner
  allVoters?: unknown[]
}): Promise<
  ServiceResult<
    {
      contractHash: string
      myVoted: unknown
      isVoter: boolean
      currentVote: VoteTopic | Record<string, unknown>
      votedRecords: GovernanceVoteRecord[]
    },
    NetworkFailure
  >
> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const currentAddress = resolveVoteAddress(voteWallet, address)
      const [myVoted, currentVote, records] = await Promise.all([
        currentAddress
          ? queryVotedInfo(resolvedContractHash, hash, currentAddress)
          : Promise.resolve('NOT_VOTED'),
        queryTopicInfo(resolvedContractHash, network, hash),
        queryVotedRecords(resolvedContractHash, hash),
      ])
      const votedRecords = mapVoteRecords(records as unknown[], allVoters) as GovernanceVoteRecord[]

      return {
        contractHash: resolvedContractHash,
        myVoted,
        isVoter: isVoteVoter({ allVoters, address: currentAddress }),
        currentVote: currentVote as unknown as VoteTopic | Record<string, unknown>,
        votedRecords,
      }
    },
    { context: 'loadVoteDetail', errorKey: NETWORK_ERROR_KEY, logger: voteTopicLogger }
  ) as Promise<
    ServiceResult<
      {
        contractHash: string
        myVoted: unknown
        isVoter: boolean
        currentVote: VoteTopic | Record<string, unknown>
        votedRecords: GovernanceVoteRecord[]
      },
      NetworkFailure
    >
  >
}

export { isVoteVoterRecord, type VoteVoterRecord } from './voteTopicShared'
