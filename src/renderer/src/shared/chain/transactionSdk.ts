import { DEFAULT_SCRYPT } from '../lib/constants'
import type { ScryptParams } from '../lib/types'
import { loadOntologySdk } from './loadOntologySdk'
import type {
  SdkAddressLike,
  SdkPrivateKeyLike,
  SdkPublicKeyLike,
  SdkTransactionLike,
} from './types'

function normalizePublicKeys(
  Crypto: { PublicKey: new (key: string) => SdkPublicKeyLike },
  publicKeys: Array<string | SdkPublicKeyLike> = []
) {
  return publicKeys.map((key) => (typeof key === 'string' ? new Crypto.PublicKey(key) : key))
}

export async function tryDecryptWallet(
  wallet: { key: string; address: string; salt: string },
  password: string,
  scrypt: ScryptParams = DEFAULT_SCRYPT
) {
  const { Crypto } = await loadOntologySdk()
  const encryptedKey = new Crypto.PrivateKey(wallet.key) as SdkPrivateKeyLike

  try {
    return encryptedKey.decrypt(password, new Crypto.Address(wallet.address), wallet.salt, scrypt)
  } catch {
    return null
  }
}

export async function deserializeTransaction(hex: string) {
  const { Transaction } = await loadOntologySdk()
  return Transaction.deserialize(hex)
}

export async function signTransactionWithPrivateKey(tx: SdkTransactionLike, privateKey: unknown) {
  const { TransactionBuilder } = await loadOntologySdk()
  TransactionBuilder.signTransaction(tx as never, privateKey as never)
}

export async function addTransactionSign(tx: SdkTransactionLike, privateKey: unknown) {
  const { TransactionBuilder } = await loadOntologySdk()
  TransactionBuilder.addSign(tx as never, privateKey as never)
}

export async function signTransactionMultiSig(
  tx: SdkTransactionLike,
  M: number,
  publicKeys: Array<string | SdkPublicKeyLike>,
  privateKey: unknown
) {
  const { Crypto, TransactionBuilder } = await loadOntologySdk()
  TransactionBuilder.signTx(
    tx as never,
    M,
    normalizePublicKeys(Crypto, publicKeys) as never,
    privateKey as never
  )
}

export async function createInvokeTransaction(
  method: string,
  params: unknown[],
  contractAddr: SdkAddressLike,
  gasPrice: number | string,
  gasLimit: number | string,
  payer: SdkAddressLike
) {
  const { TransactionBuilder } = await loadOntologySdk()
  return TransactionBuilder.makeInvokeTransaction(
    method,
    params as never,
    contractAddr as never,
    gasPrice as never,
    gasLimit as never,
    payer as never
  )
}

export async function createSdkParameter(name: string, type: string, value: unknown) {
  const { Parameter } = await loadOntologySdk()
  return new Parameter(name, type as never, value)
}

export async function createSdkPublicKey(pkHex: string) {
  const { Crypto } = await loadOntologySdk()
  return new Crypto.PublicKey(pkHex)
}

export async function createSdkTxSignature(
  M: number,
  publicKeys: Array<string | SdkPublicKeyLike>,
  sigData: string[]
) {
  const { Crypto, TxSignature } = await loadOntologySdk()
  const signature = new TxSignature()
  signature.M = M
  signature.pubKeys = normalizePublicKeys(Crypto, publicKeys) as never
  signature.sigData = sigData
  return signature
}

export async function makeDummyTransferTx(
  from: SdkAddressLike,
  to: SdkAddressLike,
  asset: string,
  amount: string | number
) {
  const { OntAssetTxBuilder } = await loadOntologySdk()
  return OntAssetTxBuilder.makeTransferTx(
    asset,
    from as never,
    to as never,
    amount,
    '500',
    '20000',
    from as never
  )
}
