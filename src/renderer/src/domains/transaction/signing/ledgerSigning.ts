/**
 * Ledger (hardware-wallet) signing. A single device-signing core drives every
 * mode — single signature, additional signature, multi-sig (first/subsequent),
 * and raw-payload message signing — so the verify/assert/sign sequence lives in
 * exactly one place.
 */

import {
  checkPublicKeyIsInTheConnectedLedger,
  legacySignWithLedger,
} from '../../../shared/chain/ledgerSigner'
import { createSdkTxSignature, makeDummyTransferTx } from '../../../shared/chain/transactionSdk'
import { createSdkAddress } from '../../../shared/chain/walletSdk'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import type { HardwareWalletSigner, WalletSigner } from '../../../shared/lib/types'
import { serializeTx } from '../serializationService'
import { assertTransactionGasPrice } from '../transactionGasPrice'
import { normalizeLedgerSigner, type NormalizedLedgerSigner } from './signerFields'

/** Signature-scheme byte prefixed onto every Ledger-produced signature. */
export const LEDGER_SIG_SCHEME_PREFIX = '01'

/**
 * Verify the connected device matches the signer, assert the tx still carries a
 * gas price, then sign the unsigned tx bytes. Returns the scheme-prefixed hex.
 */
async function signUnsignedTxWithLedger(
  tx: SdkTransactionLike,
  signer: NormalizedLedgerSigner
): Promise<string> {
  await checkPublicKeyIsInTheConnectedLedger(signer.accountIndex, signer.isNeo, signer.publicKey)
  assertTransactionGasPrice(tx)
  const signature = await legacySignWithLedger(
    tx.serializeUnsignedData(),
    signer.isNeo,
    signer.accountIndex
  )
  return LEDGER_SIG_SCHEME_PREFIX + signature
}

/** Single-signature Ledger signing — replaces `tx.sigs` with one signature (M=1). */
export async function signWithLedger(
  tx: SdkTransactionLike,
  wallet: WalletSigner & Record<string, unknown>
): Promise<SdkTransactionLike> {
  const signer = normalizeLedgerSigner(wallet)
  const sigData = await signUnsignedTxWithLedger(tx, signer)
  tx.sigs = [await createSdkTxSignature(1, [signer.publicKey], [sigData])]
  return tx
}

/** Append an additional Ledger signature without replacing existing sigs. */
export async function addLedgerSignature({
  tx,
  wallet,
}: {
  tx: SdkTransactionLike
  wallet: HardwareWalletSigner & Record<string, unknown>
}): Promise<SdkTransactionLike> {
  const signer = normalizeLedgerSigner(wallet)
  const sigData = await signUnsignedTxWithLedger(tx, signer)
  tx.sigs = Array.isArray(tx.sigs) ? tx.sigs : []
  tx.sigs.push(await createSdkTxSignature(1, [signer.publicKey], [sigData]))
  return tx
}

/**
 * Multi-sig Ledger signing. The first signer seeds a new `M`-of-N signature
 * entry; subsequent signers append their sigData onto the existing entry.
 */
export async function signSharedTxWithLedger(
  tx: SdkTransactionLike,
  M: number,
  publicKeys: string[],
  wallet: WalletSigner & Record<string, unknown>,
  isFirstSign: boolean
): Promise<SdkTransactionLike> {
  const signer = normalizeLedgerSigner(wallet)
  const sigData = await signUnsignedTxWithLedger(tx, signer)

  if (isFirstSign) {
    tx.sigs = Array.isArray(tx.sigs) ? tx.sigs : []
    tx.sigs.push(await createSdkTxSignature(M, publicKeys, [sigData]))
    return tx
  }

  if (!tx.sigs?.[0]?.sigData) {
    throw new Error('Shared transaction signature payload is missing')
  }
  tx.sigs[0].sigData.push(sigData)
  return tx
}

/**
 * Sign a Ledger payload. Raw string payloads are wrapped in a dummy transfer tx
 * (its `payload.code` set to the payload) and returned serialized; transaction
 * objects are routed through {@link signWithLedger}.
 */
export async function signLedgerPayload({
  payload,
  wallet,
}: {
  payload: string | SdkTransactionLike
  wallet: HardwareWalletSigner & { publicKey: string }
}): Promise<string | SdkTransactionLike> {
  if (typeof payload !== 'string') {
    return signWithLedger(payload, wallet)
  }

  await checkPublicKeyIsInTheConnectedLedger(wallet.acct || 0, wallet.neo, wallet.publicKey)

  const address = await createSdkAddress(wallet.address)
  const tx = await makeDummyTransferTx(address, address, 'ONT', '1')
  tx.payload.code = payload

  const signature = await legacySignWithLedger(
    tx.serializeUnsignedData(),
    wallet.neo,
    wallet.acct || 0
  )
  tx.sigs = [
    await createSdkTxSignature(1, [wallet.publicKey], [LEDGER_SIG_SCHEME_PREFIX + signature]),
  ]
  return serializeTx(tx as unknown as SdkTransactionLike, 'transaction.signLedgerPayload.serialize')
}
