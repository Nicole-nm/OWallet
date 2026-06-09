import { GAS_PRICE, GAS_LIMIT_HIGH } from '../../shared/lib/constants'
import { VOTE_CONTRACT_HASH, VOTE_CONTRACT_HASH_OLD } from './constants'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import { assertSdkTransactionLike } from '../../shared/chain/sdkBoundary'
import type { SdkTransactionLike } from '../../shared/chain/types'

export function getContractHashFallback(net: string) {
  return VOTE_CONTRACT_HASH[net] || ''
}

export function getOldContractHash(net: string) {
  return VOTE_CONTRACT_HASH_OLD[net] || ''
}

/**
 * Lazy-load the subset of the Ontology SDK needed by vote transactions.
 * Hoisted here so query/build call sites don't each import the full surface.
 */
export async function loadVoteSdk() {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType, TxSignature } =
    await loadOntologySdk()
  return {
    TransactionBuilder,
    Crypto,
    utils,
    Parameter,
    ParameterType,
    TxSignature,
  }
}

/** Build an unsigned `voteTopic` transaction. */
export async function buildVoteTx(
  contractHash: string,
  hash: string,
  address: string,
  approve: boolean
): Promise<SdkTransactionLike> {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const addr = new Crypto.Address(address)
  const params = [
    new Parameter('', ParameterType.H256, hash),
    new Parameter('', ParameterType.Address, addr),
    new Parameter('', ParameterType.Boolean, approve),
  ]

  return assertSdkTransactionLike(
    TransactionBuilder.makeWasmVmInvokeTransaction(
      'voteTopic',
      params,
      contract,
      GAS_PRICE,
      GAS_LIMIT_HIGH,
      addr
    ),
    'TransactionBuilder.makeWasmVmInvokeTransaction(voteTopic)'
  )
}

/** Build an unsigned `cancelTopic` transaction. */
export async function buildCancelTopicTx(
  contractHash: string,
  hash: string,
  address: string
): Promise<SdkTransactionLike> {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const addr = new Crypto.Address(address)
  const params = [new Parameter('', ParameterType.H256, hash)]

  return assertSdkTransactionLike(
    TransactionBuilder.makeWasmVmInvokeTransaction(
      'cancelTopic',
      params,
      contract,
      GAS_PRICE,
      GAS_LIMIT_HIGH,
      addr
    ),
    'TransactionBuilder.makeWasmVmInvokeTransaction(cancelTopic)'
  )
}

/** Build an unsigned `createTopic` transaction. */
export async function buildCreateTopicTx(
  contractHash: string,
  address: string,
  vote: { title: string; content: string; startTime: number; endTime: number }
): Promise<SdkTransactionLike> {
  const { TransactionBuilder, Crypto, utils, Parameter, ParameterType } = await loadVoteSdk()
  const contract = new Crypto.Address(utils.reverseHex(contractHash))
  const addr = new Crypto.Address(address)
  const params = [
    new Parameter('', ParameterType.Address, addr),
    new Parameter('', ParameterType.String, vote.title),
    new Parameter('', ParameterType.String, vote.content),
    new Parameter('', ParameterType.Integer, vote.startTime),
    new Parameter('', ParameterType.Integer, vote.endTime),
  ]

  return assertSdkTransactionLike(
    TransactionBuilder.makeWasmVmInvokeTransaction(
      'createTopic',
      params,
      contract,
      GAS_PRICE,
      GAS_LIMIT_HIGH,
      addr
    ),
    'TransactionBuilder.makeWasmVmInvokeTransaction(createTopic)'
  )
}
