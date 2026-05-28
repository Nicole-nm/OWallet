/**
 * Wallet signing orchestrator.
 *
 * Contains the CommonWallet / Ledger / SharedWallet branching logic that
 * decides *how* a transaction or payload is signed. applicationService.ts
 * delegates all signing decisions here and stays a thin orchestration facade.
 */

import {
  makeDummyTransferTx,
  createSdkPublicKey,
  createSdkTxSignature,
  addTransactionSign,
  tryDecryptWallet,
} from '../../shared/chain/transactionSdk'
import { createSdkAddress } from '../../shared/chain/walletSdk'
import { LEDGER_GAS_PRICE } from '../../shared/lib/constants'
import {
  checkPublicKeyIsInTheConnectedLedger,
  legacySignWithLedger,
} from '../../shared/chain/ledgerSigner'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { signMessageWithWallet, signWithLedger, signWithWallet } from './signingService'
import { serializeTx } from './serializationService'
import { isCommonWallet } from '../../shared/lib/types'
import type { HardwareWalletSigner, WalletSigner } from '../../shared/lib/types'
import type { SignedTransaction, TransactionDraft } from './types'

function setLedgerGasPrice(tx: SdkTransactionLike) {
  if (!tx.gasPrice) {
    throw new Error('Transaction gas price is unavailable')
  }

  tx.gasPrice = new tx.gasPrice.constructor(LEDGER_GAS_PRICE) as SdkTransactionLike['gasPrice']
}

// ---------------------------------------------------------------------------
// CommonWallet signing
// ---------------------------------------------------------------------------

/**
 * Sign a transaction with a software (CommonWallet) key.
 * Returns `null` when password decryption fails.
 */
export async function signTransactionWithWallet(
  tx: TransactionDraft,
  wallet: WalletSigner,
  password?: string
): Promise<SignedTransaction | null> {
  const signed = await signWithWallet(tx, wallet, password)
  return signed ?? null
}

/**
 * Append an additional CommonWallet signature to an existing multi-sig
 * transaction without replacing existing sigs.
 * Returns `null` when password decryption fails.
 */
export async function addWalletSignature({
  tx,
  wallet,
  password,
}: {
  tx: SdkTransactionLike
  wallet: WalletSigner & { key: string; address: string; salt: string }
  password: string
}): Promise<SdkTransactionLike | null> {
  return tryDecryptWallet(wallet, password).then(async (privateKey) => {
    if (!privateKey) {
      return null
    }

    await addTransactionSign(tx, privateKey)
    return tx
  })
}

// ---------------------------------------------------------------------------
// Ledger (HardwareWallet) signing
// ---------------------------------------------------------------------------

/**
 * Sign a transaction with a connected Ledger device.
 * Verifies device identity, sets payer/gasPrice, then appends the signature.
 */
export async function addLedgerSignature({
  tx,
  wallet,
}: {
  tx: SdkTransactionLike
  wallet: HardwareWalletSigner & Record<string, unknown>
}): Promise<SdkTransactionLike> {
  const nestedWallet = wallet.wallet as Record<string, unknown> | undefined
  const publicKeyHex = String(nestedWallet?.publicKey || wallet.publicKey || '')
  const address = String(nestedWallet?.address || wallet.address || '')
  const neo = Boolean(nestedWallet?.neo ?? wallet.neo)
  const acct = Number(nestedWallet?.acct ?? wallet.acct ?? 0)

  if (neo !== undefined || publicKeyHex) {
    await checkPublicKeyIsInTheConnectedLedger(acct, neo, publicKeyHex)
  }

  tx.payer = await createSdkAddress(address)
  setLedgerGasPrice(tx)

  const signature = await legacySignWithLedger(tx.serializeUnsignedData(), neo, acct)
  tx.sigs = Array.isArray(tx.sigs) ? tx.sigs : []
  tx.sigs.push(
    await createSdkTxSignature(1, [await createSdkPublicKey(publicKeyHex)], ['01' + signature])
  )
  return tx
}

// ---------------------------------------------------------------------------
// Unified branching: CommonWallet vs Ledger
// ---------------------------------------------------------------------------

/**
 * Sign a transaction — routes to CommonWallet or Ledger based on wallet type.
 * Returns `null` on failure (wrong password or ledger cancelled).
 */
export async function signTransaction({
  tx,
  wallet,
  password,
}: {
  tx: SdkTransactionLike
  wallet: WalletSigner
  password?: string
}): Promise<SignedTransaction | null> {
  if (isCommonWallet(wallet)) {
    return signTransactionWithWallet(tx, wallet, password)
  }

  return signWithLedger(tx, wallet)
}

/**
 * Append a co-signer signature — routes to CommonWallet or Ledger.
 * Returns `null` on password failure.
 */
export async function addSignerSignature({
  tx,
  wallet,
  password,
}: {
  tx: SdkTransactionLike
  wallet: WalletSigner
  password?: string
}): Promise<SdkTransactionLike | null> {
  if (isCommonWallet(wallet)) {
    return addWalletSignature({ tx, wallet, password: password || '' })
  }

  return addLedgerSignature({ tx, wallet })
}

/**
 * Sign an arbitrary payload — routes string payloads to message signing and
 * transaction objects to transaction signing.
 */
export async function signPayload({
  payload,
  wallet,
  password,
}: {
  payload: string | SdkTransactionLike
  wallet: WalletSigner
  password?: string
}): Promise<unknown> {
  if (typeof payload === 'string') {
    const signature = await signMessageWithWallet(payload, wallet, password)
    return signature ?? null
  }

  return signTransaction({ tx: payload, wallet, password })
}

/**
 * Sign a Ledger payload — handles both raw string payloads (wraps in a dummy
 * tx) and transaction objects.
 */
export async function signLedgerPayload({
  payload,
  wallet,
}: {
  payload: string | SdkTransactionLike
  wallet: HardwareWalletSigner & { publicKey: string }
}): Promise<string | SdkTransactionLike> {
  await checkPublicKeyIsInTheConnectedLedger(wallet.acct || 0, wallet.neo, wallet.publicKey)

  if (typeof payload === 'string') {
    const address = await createSdkAddress(wallet.address)
    const tx = await makeDummyTransferTx(address, address, 'ONT', '1')
    tx.payload.code = payload

    const signature = await legacySignWithLedger(
      tx.serializeUnsignedData(),
      wallet.neo,
      wallet.acct || 0
    )
    tx.sigs = [
      await createSdkTxSignature(
        1,
        [await createSdkPublicKey(wallet.publicKey)],
        ['01' + signature]
      ),
    ]
    return serializeTx(
      tx as unknown as SdkTransactionLike,
      'transaction.signLedgerPayload.serialize'
    )
  }

  return signWithLedger(payload, wallet)
}
