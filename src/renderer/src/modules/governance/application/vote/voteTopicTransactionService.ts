import {
  buildCancelTopicTx,
  buildCreateTopicTx,
  buildVoteTx,
  loadVoteSdk,
} from '../../../../domains/governance/voteService'
import { serializeTx } from '../../../../domains/transaction/serializationService'
import { submitWithAdapter } from '../../../../domains/transaction/submitWithAdapter'
import { setUnsignedTransactionGasPrice } from '../../../../domains/transaction/transactionGasPrice'
import { getRestClient } from '../../../../shared/chain/restClient'
import { assertSdkTransactionLike } from '../../../../shared/chain/sdkBoundary'
import { GAS_PRICE, GAS_LIMIT_HIGH, resolveDefaultGasPrice } from '../../../../shared/lib/constants'
import { tryCatch } from '../../../../shared/lib/result'
import type { NetworkId, WalletSigner } from '../../../../shared/lib/types'
import type { TransactionDraftResult } from '../../../../shared/types'
import type { SdkTransactionLike } from '../../../../shared/chain/types'
import type { WalletAdapter } from '../../../../domains/wallet/adapter'
import {
  getRequiredVoteContractHash,
  NETWORK_ERROR_KEY,
  resolveVoteAddress,
  voteTopicLogger,
} from './voteTopicShared'

async function setVotersAndSend(
  contractHash: string,
  hash: string,
  voters: string[],
  adapter: WalletAdapter,
  password?: string
) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const addr = new Crypto.Address(adapter.identity.address)
  const params = [
    new Parameter('', ParameterType.H256, hash),
    new Parameter('', ParameterType.Array, voters),
  ]
  const unsignedTx = assertSdkTransactionLike(
    TransactionBuilder.makeWasmVmInvokeTransaction(
      'setVoterForTopic',
      params,
      contract,
      GAS_PRICE,
      GAS_LIMIT_HIGH,
      addr
    ),
    'vote.setVotersAndSend.build'
  )

  return submitWithAdapter({
    tx:
      adapter.identity.type === 'ledger'
        ? setUnsignedTransactionGasPrice(unsignedTx, resolveDefaultGasPrice('ledger'))
        : unsignedTx,
    adapter,
    password,
    networkErrorKey: adapter.capabilities.requiresHardwareDevice
      ? 'ledgerWallet.signFailed'
      : 'common.unexpectedError',
    logger: voteTopicLogger,
    errorContext: 'setVotersAndSend',
    submit: (signedTx: SdkTransactionLike) =>
      client.sendRawTransaction(serializeTx(signedTx, 'vote.setVotersAndSend.serialize'), false),
  })
}

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
  adapter,
  password,
}: {
  contractHash?: string
  network: NetworkId
  hash: string
  voters: string[]
  adapter: WalletAdapter
  password?: string
}) {
  return tryCatch(
    async () => {
      const { contractHash: resolvedContractHash } = await getRequiredVoteContractHash({
        contractHash,
        network,
      })
      const result = await setVotersAndSend(resolvedContractHash, hash, voters, adapter, password)
      return { contractHash: resolvedContractHash, result }
    },
    {
      context: 'setVoteTopicVoters',
      errorKey: NETWORK_ERROR_KEY,
      logger: voteTopicLogger,
    }
  )
}

export type { VoteVoterRecord } from './voteTopicShared'
