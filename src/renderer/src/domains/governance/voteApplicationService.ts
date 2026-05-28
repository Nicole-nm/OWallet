import { GAS_PRICE, GAS_LIMIT_HIGH, getExplorerApiUrl } from '../../shared/lib/constants'
import { createLogger } from '../../shared/lib/logger'
import { getRestClient } from '../../shared/chain/restClient'
import httpClient from '../../shared/network/httpClient'
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
import { loadVoteSdk, handleSignTx, contractHashOld } from './voteTransactionBuilder'
import type { SdkTransactionLike } from '../../shared/chain/types'
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
  handleSignTx,
  loadVoteSdk,
} from './voteTransactionBuilder'

const logger = createLogger('voteApplicationService')

function serializeVoteTx(tx: unknown, context: string) {
  return serializeTx(tx as SdkTransactionLike, context)
}

/* -------------------------------------------------------------------------- */
/*  Parsing orchestrators                                                     */
/* -------------------------------------------------------------------------- */

export async function formatVoteInfo(infos: string[]): Promise<VoteRecord[]> {
  if (!infos) return []
  const { Crypto, utils } = await loadVoteSdk()
  return parseNewVoteInfoBatch(
    infos,
    { Crypto, utils } as Parameters<typeof parseNewVoteInfoBatch>[1],
    (err) => {
      logger.warn(
        'formatVoteInfo',
        'Failed to parse vote topic with new format, falling back to old contract parser:',
        err instanceof Error ? err.message : err
      )
    }
  )
}

export async function formatOldVoteInfo(infos: unknown[]): Promise<VoteRecord[]> {
  if (!infos) return []
  const { Crypto, utils } = await loadVoteSdk()
  return parseOldVoteInfoBatch(
    infos,
    utils as Parameters<typeof parseOldVoteInfoBatch>[1],
    Crypto as Parameters<typeof parseOldVoteInfoBatch>[2]
  )
}

/* -------------------------------------------------------------------------- */
/*  Chain queries                                                             */
/* -------------------------------------------------------------------------- */

export async function queryGovNodes(contractHash: string) {
  const { TransactionBuilder, Crypto, utils } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    'listGovNodes',
    [],
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction(
    serializeVoteTx(tx, 'vote.queryGovNodes.serialize'),
    true
  )
  if (res.Error !== 0 || !res.Result || !res.Result.Result) {
    throw res
  }
  return parseGovNodes(
    res.Result.Result,
    utils as Parameters<typeof parseGovNodes>[1],
    Crypto as Parameters<typeof parseGovNodes>[2]
  )
}

export async function queryTopicHashes(contractHash: string) {
  const { TransactionBuilder, Crypto, utils } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    'listTopics',
    [],
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction(
    serializeVoteTx(tx, 'vote.queryTopicHashes.serialize'),
    true
  )
  if (res.Error !== 0) throw res
  return parseTopicHashes(res.Result.Result, utils as Parameters<typeof parseTopicHashes>[1])
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
      const vote = parseNewVoteInfo(res.Result.Result, { Crypto, utils } as Parameters<
        typeof parseNewVoteInfo
      >[1])
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

export async function queryVotedInfo(contractHash: string, hash: string, address: string) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const params = [
    new Parameter('', ParameterType.H256, hash),
    new Parameter('', ParameterType.Address, new Crypto.Address(address)),
  ]
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    'getVotedInfo',
    params,
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction(
    serializeVoteTx(tx, 'vote.queryVotedInfo.serialize'),
    true
  )
  if (res.Error === 0) {
    return parseVotedResult(res.Result.Result, utils as Parameters<typeof parseVotedResult>[1])
  }
  return undefined
}

export async function queryVotedRecords(contractHash: string, hash: string) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const params = [new Parameter('', ParameterType.H256, hash)]
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    'getVotedAddress',
    params,
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction(
    serializeVoteTx(tx, 'vote.queryVotedRecords.serialize'),
    true
  )
  if (res.Error === 0) {
    return parseVotedRecords(
      res.Result.Result,
      utils as Parameters<typeof parseVotedRecords>[1],
      Crypto as Parameters<typeof parseVotedRecords>[2]
    )
  }
  return []
}

export async function queryVoters(contractHash: string, hash: string) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const param = new Parameter('', ParameterType.H256, hash)
  const tx = TransactionBuilder.makeWasmVmInvokeTransaction(
    'getVoters',
    [param],
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH
  )
  const res = await client.sendRawTransaction<string[][]>(
    serializeVoteTx(tx, 'vote.queryVoters.serialize'),
    true
  )
  if (res.Error === 0) {
    return res.Result.Result.map((i) =>
      parseVoterEntry(
        i,
        utils as Parameters<typeof parseVoterEntry>[1],
        Crypto as Parameters<typeof parseVoterEntry>[2]
      )
    )
  }
  return []
}

/* -------------------------------------------------------------------------- */
/*  Compound operations (query + sign + send)                                 */
/* -------------------------------------------------------------------------- */

export async function setVotersAndSend(
  contractHash: string,
  hash: string,
  voters: string[],
  wallet: { address: string; key?: string; salt?: string; publicKey?: string },
  password?: string,
  walletType?: string
) {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const client = getRestClient()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const addr = new Crypto.Address(wallet.address)
  const params = [
    new Parameter('', ParameterType.H256, hash),
    new Parameter('', ParameterType.Array, voters),
  ]
  let tx: unknown = TransactionBuilder.makeWasmVmInvokeTransaction(
    'setVoterForTopic',
    params,
    contract,
    GAS_PRICE,
    GAS_LIMIT_HIGH,
    addr
  )
  tx = await handleSignTx(tx, wallet, password, walletType)
  if (!tx) return undefined
  const res = await client.sendRawTransaction(
    serializeVoteTx(tx, 'vote.setVotersAndSend.serialize'),
    false
  )
  return res
}

/* -------------------------------------------------------------------------- */
/*  REST calls (explorer)                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchCurrentStakes(net: string) {
  const url = getExplorerApiUrl('/v2/nodes/current-stakes', net)
  const res = (await httpClient({ url, method: 'get' })) as { result?: unknown }
  return res.result
}
