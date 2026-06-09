import { GAS_PRICE, GAS_LIMIT_HIGH, getExplorerApiUrl } from '../../shared/lib/constants'
import { createLogger } from '../../shared/lib/logger'
import { getRestClient } from '../../shared/chain/restClient'
import { assertSdkTransactionLike } from '../../shared/chain/sdkBoundary'
import httpClient from '../../shared/network/httpClient'
import type {
  OntologyRestResponse,
  OntologyTransactionResult,
} from '../../shared/network/restProxy'
import { serializeTx } from '../transaction/serializationService'
import {
  parseNewVoteInfo,
  parseNewVoteInfoBatch,
  parseOldVoteInfoBatch,
  parseGovNodes,
  parseTopicHashes,
  parseVotedResult,
  parseVotedRecords,
  parseVoterEntry,
} from './voteParser'
import { loadVoteSdk } from './voteTransactionBuilder'
import { VOTE_CONTRACT_HASH_OLD as contractHashOld } from './constants'
import type { VoteRecord } from './types'

/* -------------------------------------------------------------------------- */
/*  Re-exports — keep existing call sites working                             */
/* -------------------------------------------------------------------------- */

export type { VoteRecord } from './types'
export {
  deriveVoteStatusText,
  isEligibleToVote,
  isVoteAdmin,
  canCancelVote,
  approvalRatio,
} from './voteStatusCalculator'
export {
  getContractHashFallback,
  getOldContractHash,
  buildVoteTx,
  buildCancelTopicTx,
  buildCreateTopicTx,
  loadVoteSdk,
} from './voteTransactionBuilder'

const logger = createLogger('voteService')

function serializeVoteTx(tx: unknown, context: string) {
  return serializeTx(assertSdkTransactionLike(tx, context), context)
}

type VoteSdk = Awaited<ReturnType<typeof loadVoteSdk>>
type WasmReadResponse<TInner> = OntologyRestResponse<OntologyTransactionResult<TInner>>

/**
 * Run a read-only WASM-VM contract call and hand the raw response to `handle`.
 * Centralizes the shared skeleton (load SDK → resolve contract address → build
 * the invoke tx → serialize → send) so each query only declares its params and
 * how to interpret the result.
 */
async function invokeWasmRead<TReturn, TInner = string>(
  contractHash: string,
  method: string,
  buildParams: (sdk: VoteSdk) => InstanceType<VoteSdk['Parameter']>[],
  handle: (res: WasmReadResponse<TInner>, sdk: VoteSdk) => TReturn,
  context: string
): Promise<TReturn> {
  const sdk = await loadVoteSdk()
  const { TransactionBuilder, Crypto, utils } = sdk
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    method,
    buildParams(sdk),
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction<TInner>(serializeVoteTx(tx, context), true)
  return handle(res, sdk)
}

/* -------------------------------------------------------------------------- */
/*  Parsing orchestrators                                                     */
/* -------------------------------------------------------------------------- */

export async function formatVoteInfo(infos: string[]): Promise<VoteRecord[]> {
  if (!infos) return []
  const { Crypto, utils } = await loadVoteSdk()
  return parseNewVoteInfoBatch(infos, { Crypto, utils }, (err) => {
    logger.warn(
      'formatVoteInfo',
      'Failed to parse vote topic with new format, falling back to old contract parser:',
      err instanceof Error ? err.message : err
    )
  })
}

export async function formatOldVoteInfo(infos: unknown[]): Promise<VoteRecord[]> {
  if (!infos) return []
  const { Crypto, utils } = await loadVoteSdk()
  return parseOldVoteInfoBatch(infos, utils, Crypto)
}

/* -------------------------------------------------------------------------- */
/*  Chain queries                                                             */
/* -------------------------------------------------------------------------- */

export function queryGovNodes(contractHash: string) {
  return invokeWasmRead(
    contractHash,
    'listGovNodes',
    () => [],
    (res, { Crypto, utils }) => {
      if (res.Error !== 0 || !res.Result || !res.Result.Result) {
        throw res
      }
      return parseGovNodes(res.Result.Result, utils, Crypto)
    },
    'vote.queryGovNodes.serialize'
  )
}

export function queryTopicHashes(contractHash: string) {
  return invokeWasmRead(
    contractHash,
    'listTopics',
    () => [],
    (res, { utils }) => {
      if (res.Error !== 0) throw res
      return parseTopicHashes(res.Result.Result, utils)
    },
    'vote.queryTopicHashes.serialize'
  )
}

export async function queryTopicInfos(contractHash: string, hashes: string[]) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const txes = hashes.map((hash) =>
    TransactionBuilder.makeWasmVmInvokeTransaction(
      'getTopicInfo',
      [new Parameter('', ParameterType.H256, hash)],
      contract,
      GAS_PRICE,
      GAS_LIMIT_HIGH
    )
  )
  const results = await Promise.allSettled(
    txes.map((tx) =>
      client.sendRawTransaction(serializeVoteTx(tx, 'vote.queryTopicInfos.serialize'), true)
    )
  )
  const infoList: string[] = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const info = result.value
    if (info && info.Result && info.Result.Result) {
      infoList.push(info.Result.Result)
    }
  }
  return formatVoteInfo(infoList)
}

export async function queryOldTopicInfos(net: string, hashes: string[]) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contractOld = new Crypto.Address(utils.reverseHex(contractHashOld[net] as string))
  const txes = hashes.map((hash) =>
    TransactionBuilder.makeInvokeTransaction(
      'getTopicInfo',
      [new Parameter('', ParameterType.ByteArray, hash)],
      contractOld,
      GAS_PRICE,
      GAS_LIMIT_HIGH
    )
  )
  const results = await Promise.allSettled(
    txes.map((tx) =>
      client.sendRawTransaction(serializeVoteTx(tx, 'vote.queryOldTopicInfos.serialize'), true)
    )
  )
  const infoList: unknown[] = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const info = result.value
    if (info && info.Result && info.Result.Result) {
      infoList.push(info)
    }
  }
  return formatOldVoteInfo(infoList)
}

export async function queryTopicInfo(contractHash: string, net: string, hash: string) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const params = [new Parameter('', ParameterType.H256, hash)]
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    'getTopicInfo',
    params,
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction(
    serializeVoteTx(tx, 'vote.queryTopicInfo.serialize'),
    true
  )
  if (res.Error === 0) {
    try {
      const vote = parseNewVoteInfo(res.Result.Result, { Crypto, utils })
      if (vote) {
        return vote
      }
    } catch (err: unknown) {
      logger.warn(
        'queryTopicInfo',
        'Failed to parse single vote topic with new format, falling back to old contract parser:',
        err instanceof Error ? err.message : err
      )
    }
  }
  const contractOld = new Crypto.Address(utils.reverseHex(contractHashOld[net] as string))
  const paramsOld = [new Parameter('', ParameterType.ByteArray, hash)]
  const txOld = TransactionBuilder.makeInvokeTransaction(
    'getTopicInfo',
    paramsOld,
    contractOld,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const resOld = await client.sendRawTransaction(
    serializeVoteTx(txOld, 'vote.queryTopicInfo.oldSerialize'),
    true
  )
  if (resOld.Error === 0) {
    const votesOld = await formatOldVoteInfo([resOld])
    return votesOld[0]
  }
  return null
}

export function queryVotedInfo(contractHash: string, hash: string, address: string) {
  return invokeWasmRead(
    contractHash,
    'getVotedInfo',
    ({ Crypto, Parameter, ParameterType }) => [
      new Parameter('', ParameterType.H256, hash),
      new Parameter('', ParameterType.Address, new Crypto.Address(address)),
    ],
    (res, { utils }) => {
      if (res.Error === 0) {
        return parseVotedResult(res.Result.Result, utils)
      }
      return undefined
    },
    'vote.queryVotedInfo.serialize'
  )
}

export function queryVotedRecords(contractHash: string, hash: string) {
  return invokeWasmRead(
    contractHash,
    'getVotedAddress',
    ({ Parameter, ParameterType }) => [new Parameter('', ParameterType.H256, hash)],
    (res, { Crypto, utils }) => {
      if (res.Error === 0) {
        return parseVotedRecords(res.Result.Result, utils, Crypto)
      }
      return []
    },
    'vote.queryVotedRecords.serialize'
  )
}

export function queryVoters(contractHash: string, hash: string) {
  return invokeWasmRead<ReturnType<typeof parseVoterEntry>[], string[][]>(
    contractHash,
    'getVoters',
    ({ Parameter, ParameterType }) => [new Parameter('', ParameterType.H256, hash)],
    (res, { Crypto, utils }) => {
      if (res.Error === 0) {
        return res.Result.Result.map((i) => parseVoterEntry(i, utils, Crypto))
      }
      return []
    },
    'vote.queryVoters.serialize'
  )
}

/* -------------------------------------------------------------------------- */
/*  REST calls (explorer)                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchCurrentStakes(net: string) {
  const url = getExplorerApiUrl('/v2/nodes/current-stakes', net)
  const res = (await httpClient({ url, method: 'get' })) as { result?: unknown }
  return res.result
}
