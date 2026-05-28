import {
  buildCancelTopicTx,
  buildCreateTopicTx,
  buildVoteTx,
  setVotersAndSend,
} from '../../../domains/governance/voteApplicationService'
import { tryCatch } from '../../../shared/lib/result'
import type { NetworkId, WalletSigner } from '../../../shared/lib/types'
import type { TransactionDraftResult } from '../../../shared/types'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import {
  getRequiredVoteContractHash,
  NETWORK_ERROR_KEY,
  resolveVoteAddress,
  voteTopicLogger,
} from './voteTopicShared'

export async function createVoteDecisionTransaction({
  contractHash = '',
  network,
  hash,
  approve,
  address,
  voteWallet,
}: {
  contractHash?: string
  network: NetworkId
  hash: string
  approve: boolean
  address?: string
  voteWallet?: WalletSigner
}): Promise<
  TransactionDraftResult<SdkTransactionLike, { error: unknown }, { contractHash: string }>
> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const tx = await buildVoteTx(
        resolvedContractHash,
        hash,
        resolveVoteAddress(voteWallet, address),
        approve
      )
      return { contractHash: resolvedContractHash, tx }
    },
    {
      context: 'createVoteDecisionTransaction',
      errorKey: NETWORK_ERROR_KEY,
      logger: voteTopicLogger,
    }
  ) as Promise<
    TransactionDraftResult<SdkTransactionLike, { error: unknown }, { contractHash: string }>
  >
}

export async function createVoteStopTransaction({
  contractHash = '',
  network,
  hash,
  address,
  voteWallet,
}: {
  contractHash?: string
  network: NetworkId
  hash: string
  address?: string
  voteWallet?: WalletSigner
}): Promise<
  TransactionDraftResult<SdkTransactionLike, { error: unknown }, { contractHash: string }>
> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const tx = await buildCancelTopicTx(
        resolvedContractHash,
        hash,
        resolveVoteAddress(voteWallet, address)
      )
      return { contractHash: resolvedContractHash, tx }
    },
    {
      context: 'createVoteStopTransaction',
      errorKey: NETWORK_ERROR_KEY,
      logger: voteTopicLogger,
    }
  ) as Promise<
    TransactionDraftResult<SdkTransactionLike, { error: unknown }, { contractHash: string }>
  >
}

export async function createVoteTopicTransaction({
  contractHash = '',
  network,
  vote,
  address,
  voteWallet,
}: {
  contractHash?: string
  network: NetworkId
  vote: Record<string, unknown>
  address?: string
  voteWallet?: WalletSigner
}): Promise<
  TransactionDraftResult<SdkTransactionLike, { error: unknown }, { contractHash: string }>
> {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const tx = await buildCreateTopicTx(
        resolvedContractHash,
        resolveVoteAddress(voteWallet, address),
        vote as {
          title: string
          content: string
          startTime: number
          endTime: number
        }
      )
      return { contractHash: resolvedContractHash, tx }
    },
    {
      context: 'createVoteTopicTransaction',
      errorKey: NETWORK_ERROR_KEY,
      logger: voteTopicLogger,
    }
  ) as Promise<
    TransactionDraftResult<SdkTransactionLike, { error: unknown }, { contractHash: string }>
  >
}

export async function setVoteTopicVoters({
  contractHash = '',
  network,
  hash,
  voters,
  wallet,
  password,
  walletType,
}: {
  contractHash?: string
  network: NetworkId
  hash: string
  voters: string[]
  wallet: WalletSigner
  password?: string
  walletType: string
}) {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const response = await setVotersAndSend(
        resolvedContractHash,
        hash,
        voters,
        wallet,
        password,
        walletType
      )
      return { contractHash: resolvedContractHash, response }
    },
    {
      context: 'setVoteTopicVoters',
      errorKey: NETWORK_ERROR_KEY,
      logger: voteTopicLogger,
    }
  )
}

export type { VoteVoterRecord } from './voteTopicShared'
