import { VOTE_ROLE } from '../../../shared/lib/constants'
import { createLogger } from '../../../shared/lib/logger'
import { deriveAddressFromPublicKey } from '../../../domains/wallet/accountService'
import { fetchVoteContractAddress } from '../../../domains/nodeStake/applicationService'
import { getContractHashFallback } from '../../../domains/governance/voteApplicationService'
import { normalizeNodePublicKey } from '../domain/nodeMapper'
import type { GovernanceVoter } from '../../../shared/types'
import type { NetworkId, WalletSigner } from '../../../shared/lib/types'

export const voteTopicLogger = createLogger('voteTopicApplicationService')
export const NETWORK_ERROR_KEY = 'common.networkErr'
const UNKNOWN_ERROR = 'Unknown error'

interface VoteContractAddressResponse {
  vote_contract_address?: string
}

type VoteStakeRecord = Record<string, unknown> & {
  currentStake?: number
  current_stake?: number
  name?: string
}

type VoteRecord = Record<string, unknown> & { address?: string }

export type VoteVoterRecord = GovernanceVoter
export type NetworkFailure = { error: unknown }

export function isVoteVoterRecord(value: unknown): value is VoteVoterRecord {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { address?: unknown }).address === 'string'
  )
}

export function normalizeVoteVoters(voters: unknown[] = []): VoteVoterRecord[] {
  return voters.filter(isVoteVoterRecord)
}

export function describeVoteError(err: unknown) {
  if (!err) return UNKNOWN_ERROR
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err

  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export function resolveVoteAddress(voteWallet?: WalletSigner, address?: string) {
  return address || voteWallet?.address || ''
}

export async function resolveVoteContractHash({
  contractHash = '',
  network,
}: {
  contractHash?: string
  network: NetworkId
}) {
  if (contractHash) {
    return { ok: true, contractHash, cached: true }
  }

  try {
    const response = (await fetchVoteContractAddress(
      network,
      network
    )) as VoteContractAddressResponse
    const resolvedContractHash = response?.vote_contract_address || getContractHashFallback(network)

    return {
      ok: Boolean(resolvedContractHash),
      contractHash: resolvedContractHash,
      usedFallback: !response?.vote_contract_address,
    }
  } catch (err: unknown) {
    voteTopicLogger.error('resolveVoteContractHash', describeVoteError(err))
    const fallbackContractHash = getContractHashFallback(network)

    if (!fallbackContractHash) {
      return { ok: false, errorKey: NETWORK_ERROR_KEY, error: err, contractHash: '' }
    }

    return { ok: true, contractHash: fallbackContractHash, usedFallback: true, error: err }
  }
}

export async function getRequiredVoteContractHash({
  contractHash = '',
  network,
}: {
  contractHash?: string
  network: NetworkId
}) {
  const result = await resolveVoteContractHash({ contractHash, network })

  if (!result.contractHash) {
    throw new Error('Vote contract hash is unavailable')
  }

  return result
}

export async function buildStakeAddressMap(stakes: unknown[] = []) {
  const pairs = await Promise.all(
    stakes.map(async (stake) => {
      const stakeObj = stake as VoteStakeRecord
      const publicKey = normalizeNodePublicKey(stake)
      const weight = Number(stakeObj.currentStake ?? stakeObj.current_stake ?? 0)

      return [
        await deriveAddressFromPublicKey(publicKey),
        {
          name: String(stakeObj.name || ''),
          weight,
        },
      ] as const
    })
  )

  return new Map(pairs)
}

export function mapGovernanceVoters(
  voters: unknown[] = [],
  stakeAddressMap = new Map<string, { name: string; weight: number }>()
) {
  return normalizeVoteVoters(voters).map((voter) => {
    const address = voter.address
    const matchedStake = stakeAddressMap.get(address)

    return {
      ...voter,
      name: matchedStake?.name || address.substring(0, 8),
      weight: matchedStake?.weight ?? voter.weight ?? 0,
    }
  })
}

export function mapVoteRecords(records: unknown[] = [], voters: unknown[] = []) {
  const normalizedVoters = normalizeVoteVoters(voters)

  return records.map((record) => {
    const recordObj = record as VoteRecord
    const address = String(recordObj.address || '')
    const matchedVoter = normalizedVoters.find((voter) => voter.address === address)

    return {
      ...recordObj,
      name: matchedVoter?.name || '',
    }
  })
}

export function buildVoteRoleFromVoter(voter?: VoteVoterRecord | null) {
  return voter ? [VOTE_ROLE.VOTER, VOTE_ROLE.ADMIN] : []
}
