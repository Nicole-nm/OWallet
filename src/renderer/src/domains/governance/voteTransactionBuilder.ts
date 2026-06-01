import {
  GAS_PRICE,
  GAS_LIMIT_HIGH,
  DEFAULT_SCRYPT,
  NETWORKS,
  resolveDefaultGasPrice,
} from '../../shared/lib/constants'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import { assertSdkTransactionLike } from '../../shared/chain/sdkBoundary'
import {
  checkPublicKeyIsInTheConnectedLedger,
  legacySignWithLedger,
} from '../../shared/chain/ledgerSigner'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { setUnsignedTransactionGasPrice } from '../transaction/transactionGasPrice'

/**
 * Vote contract hashes per network. The "old" map tracks a legacy testnet
 * deployment that still serves existing topics; mainnet is unchanged.
 */
const contractHashNew: Record<string, string> = {
  [NETWORKS.MAIN_NET]: 'c0df752ca786a99755b2e8950060ade9fa3d4e1b',
  [NETWORKS.TEST_NET]: '32a7403e17eb9a2bbeeb7bc3eaa6dee7b0ae3829',
}
const contractHashOld: Record<string, string> = {
  [NETWORKS.MAIN_NET]: 'c0df752ca786a99755b2e8950060ade9fa3d4e1b',
  [NETWORKS.TEST_NET]: 'a088ae3b508794e666ab649d890213e66e0c3a2e',
}

export function getContractHashFallback(net: string) {
  return contractHashNew[net] || ''
}

export function getOldContractHash(net: string) {
  return contractHashOld[net] || ''
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

export type VoteWallet = {
  address: string
  key?: string
  salt?: string
  publicKey?: string
  neo?: boolean | number
  acct?: number
}

function normalizeLedgerBoolean(value: unknown): boolean {
  return value === true || value === 1
}

function normalizeLedgerAccountIndex(value: unknown): number {
  const accountIndex = Number(value ?? 0)
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error('Ledger account index is invalid')
  }
  return accountIndex
}

/**
 * Sign a vote transaction using either a software key (decrypt -> sign) or a
 * connected Ledger (legacy signing path).
 */
export async function handleSignTx(
  tx: unknown,
  wallet: VoteWallet,
  password?: string,
  walletType: 'commonWallet' | string = 'commonWallet'
) {
  const { TransactionBuilder, Crypto, TxSignature } = await loadVoteSdk()
  const txObj = assertSdkTransactionLike(tx, 'vote transaction')

  if (walletType === 'commonWallet') {
    const enc = new Crypto.PrivateKey(wallet.key || '')
    const pri = enc.decrypt(
      password || '',
      new Crypto.Address(wallet.address),
      wallet.salt || '',
      DEFAULT_SCRYPT
    )
    TransactionBuilder.signTransaction(txObj as never, pri)
  } else {
    const publicKey = wallet.publicKey || ''
    if (!publicKey) {
      throw new Error('Ledger public key is unavailable')
    }

    const accountIndex = normalizeLedgerAccountIndex(wallet.acct)
    const isNeo = normalizeLedgerBoolean(wallet.neo)
    await checkPublicKeyIsInTheConnectedLedger(accountIndex, isNeo, publicKey)

    const pk = new Crypto.PublicKey(publicKey)
    const txSig = new TxSignature()
    txSig.M = 1
    txSig.pubKeys = [pk]
    setUnsignedTransactionGasPrice(txObj, resolveDefaultGasPrice('ledger'))

    const txData = txObj.serializeUnsignedData()
    const res = await legacySignWithLedger(txData, isNeo, accountIndex)
    const sign = '01' + res
    txSig.sigData = [sign]
    txObj.sigs = Array.isArray(txObj.sigs) ? txObj.sigs : []
    txObj.sigs.push(txSig)
  }

  return txObj
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

/** Expose the old contract-hash map for callers that query across generations. */
export { contractHashOld }
