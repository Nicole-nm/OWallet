import { LEDGER_GAS_PRICE } from '../../shared/lib/constants'
import { getRestClient } from '../../shared/chain/restClient'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import { tryDecryptWallet } from '../../shared/chain/transactionSdk'
import type { SdkPrivateKeyLike, SdkTransactionLike } from '../../shared/chain/types'
import {
  checkPublicKeyIsInTheConnectedLedger,
  legacySignWithLedger,
} from '../../shared/chain/ledgerSigner'
import { serializeTx } from './serializationService'
import type { WalletSigner } from '../../shared/lib/types'

interface LegacyNestedWallet {
  wallet?: {
    address?: string
    publicKey?: string
    neo?: boolean | number
    acct?: number
    sharedWalletAddress?: string
  }
}

interface NormalizedLedgerSigner {
  address: string
  sharedWalletAddress: string
  publicKey: string
  accountIndex: number
  isNeo: boolean
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

function normalizeLedgerSigner(
  wallet: WalletSigner & Record<string, unknown>
): NormalizedLedgerSigner {
  const legacyWallet = wallet as WalletSigner & LegacyNestedWallet
  const nestedWallet = legacyWallet.wallet
  const address = String(nestedWallet?.address || wallet.address || '')
  const sharedWalletAddress = String(
    nestedWallet?.sharedWalletAddress || wallet.sharedWalletAddress || address
  )
  const publicKey = String(nestedWallet?.publicKey || wallet.publicKey || '')
  if (!publicKey) {
    throw new Error('Ledger public key is unavailable')
  }

  return {
    address,
    sharedWalletAddress,
    publicKey,
    accountIndex: normalizeLedgerAccountIndex(nestedWallet?.acct ?? wallet.acct),
    isNeo: normalizeLedgerBoolean(nestedWallet?.neo ?? wallet.neo),
  }
}

function setLedgerGasPrice(tx: SdkTransactionLike) {
  if (!tx.gasPrice) {
    throw new Error('Transaction gas price is unavailable')
  }

  tx.gasPrice = new tx.gasPrice.constructor(LEDGER_GAS_PRICE) as SdkTransactionLike['gasPrice']
}

export async function signWithWallet(
  tx: SdkTransactionLike,
  wallet: WalletSigner,
  password?: string
) {
  const { Crypto, TxSignature } = await loadOntologySdk()
  // SDK type gap: ontology-ts-sdk lacks typed return here
  const privateKey = (await tryDecryptWallet(
    wallet as WalletSigner & { key: string; address: string; salt: string },
    password || ''
  )) as SdkPrivateKeyLike | null
  if (!privateKey) return undefined

  const legacyWallet = wallet as WalletSigner & LegacyNestedWallet
  const publicKeyHex =
    legacyWallet.wallet?.publicKey || wallet.publicKey || privateKey.getPublicKey().serializeHex()
  // SDK type gap: ontology-ts-sdk lacks typed return here
  const signatureHex = privateKey.sign(tx, privateKey.algorithm?.defaultSchema).serializeHex()

  if (!publicKeyHex) {
    throw new Error('Wallet public key is unavailable')
  }
  if (!signatureHex) {
    throw new Error('Transaction signature is empty')
  }

  const txSignature = new TxSignature()
  txSignature.M = 1
  txSignature.pubKeys = [new Crypto.PublicKey(publicKeyHex)]
  txSignature.sigData = [signatureHex]
  tx.sigs = [txSignature]
  return tx
}

export async function signMessageWithWallet(
  message: string,
  wallet: WalletSigner,
  password?: string
) {
  // SDK type gap: ontology-ts-sdk lacks typed return here
  const privateKey = (await tryDecryptWallet(
    wallet as WalletSigner & { key: string; address: string; salt: string },
    password || ''
  )) as SdkPrivateKeyLike | null
  if (!privateKey) return undefined
  return privateKey.sign(message)
}

export async function signWithLedger(
  tx: SdkTransactionLike,
  wallet: WalletSigner & Record<string, unknown>
) {
  const { Crypto, TxSignature } = await loadOntologySdk()
  const ledgerSigner = normalizeLedgerSigner(wallet)
  await checkPublicKeyIsInTheConnectedLedger(
    ledgerSigner.accountIndex,
    ledgerSigner.isNeo,
    ledgerSigner.publicKey
  )

  const publicKey = new Crypto.PublicKey(ledgerSigner.publicKey)
  const txSignature = new TxSignature()
  txSignature.M = 1
  txSignature.pubKeys = [publicKey]
  tx.payer = new Crypto.Address(ledgerSigner.address)
  setLedgerGasPrice(tx)

  const txData = tx.serializeUnsignedData()
  const signature = await legacySignWithLedger(
    txData,
    ledgerSigner.isNeo,
    ledgerSigner.accountIndex
  )
  txSignature.sigData = ['01' + signature]
  tx.sigs = [txSignature]
  return tx
}

export async function signSharedTx(
  tx: SdkTransactionLike,
  M: number,
  publicKeys: string[],
  wallet: WalletSigner,
  password?: string
) {
  const { Crypto, TransactionBuilder } = await loadOntologySdk()
  // SDK type gap: ontology-ts-sdk lacks typed return here
  const privateKey = await tryDecryptWallet(
    wallet as WalletSigner & { key: string; address: string; salt: string },
    password || ''
  )
  if (!privateKey) return undefined
  const publicKeyList = publicKeys.map((key) => new Crypto.PublicKey(key))
  TransactionBuilder.signTx(tx as never, M, publicKeyList, privateKey as never)
  return tx
}

export async function signSharedTxWithLedger(
  tx: SdkTransactionLike,
  M: number,
  publicKeys: string[],
  wallet: WalletSigner & Record<string, unknown>,
  isFirstSign: boolean
) {
  const { Crypto, TxSignature } = await loadOntologySdk()
  const ledgerSigner = normalizeLedgerSigner(wallet)
  await checkPublicKeyIsInTheConnectedLedger(
    ledgerSigner.accountIndex,
    ledgerSigner.isNeo,
    ledgerSigner.publicKey
  )

  tx.payer = new Crypto.Address(ledgerSigner.sharedWalletAddress)
  setLedgerGasPrice(tx)

  const signature = await legacySignWithLedger(
    tx.serializeUnsignedData(),
    ledgerSigner.isNeo,
    ledgerSigner.accountIndex
  )
  const publicKeyList = publicKeys.map((key) => new Crypto.PublicKey(key))
  const txSig = new TxSignature()
  txSig.M = M
  txSig.pubKeys = publicKeyList

  if (isFirstSign) {
    txSig.sigData = ['01' + signature]
    tx.sigs = Array.isArray(tx.sigs) ? tx.sigs : []
    tx.sigs.push(txSig)
  } else {
    if (!tx.sigs?.[0]?.sigData) {
      throw new Error('Shared transaction signature payload is missing')
    }
    tx.sigs[0].sigData.push('01' + signature)
  }

  return tx
}

export function sendTx(tx: SdkTransactionLike) {
  const client = getRestClient()
  return client.sendRawTransaction(serializeTx(tx, 'transaction.sendTx.serialize'))
}

export function preExecTx(tx: SdkTransactionLike) {
  const client = getRestClient()
  return client.sendRawTransaction(serializeTx(tx, 'transaction.preExecTx.serialize'), true)
}
