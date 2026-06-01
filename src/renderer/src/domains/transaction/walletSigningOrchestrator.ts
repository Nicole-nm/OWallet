/**
 * Low-level signing primitives consumed by the WalletAdapter implementations.
 *
 * The wallet-type branching that lived in this file has moved to
 * `domains/wallet/adapter/` — every external caller now talks to a
 * `WalletAdapter`. This file is intentionally narrow: it only exports the
 * primitives that the adapters delegate to. Nothing in `workflows/`, `pages/`,
 * or `module-application/*` should import from here directly.
 */

import {
  makeDummyTransferTx,
  createSdkPublicKey,
  createSdkTxSignature,
  addTransactionSign,
  tryDecryptWallet,
} from '../../shared/chain/transactionSdk'
import { createSdkAddress } from '../../shared/chain/walletSdk'
import {
  checkPublicKeyIsInTheConnectedLedger,
  legacySignWithLedger,
} from '../../shared/chain/ledgerSigner'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { signWithLedger } from './signingService'
import { serializeTx } from './serializationService'
import type { HardwareWalletSigner, WalletSigner } from '../../shared/lib/types'

function assertTransactionGasPrice(tx: SdkTransactionLike) {
  if (!tx.gasPrice) {
    throw new Error('Transaction gas price is unavailable')
  }
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

/**
 * Sign a transaction with a connected Ledger device.
 * Verifies device identity, preserves the unsigned transaction, then appends the signature.
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
  const neo = Boolean(nestedWallet?.neo ?? wallet.neo)
  const acct = Number(nestedWallet?.acct ?? wallet.acct ?? 0)

  if (neo !== undefined || publicKeyHex) {
    await checkPublicKeyIsInTheConnectedLedger(acct, neo, publicKeyHex)
  }

  assertTransactionGasPrice(tx)

  const signature = await legacySignWithLedger(tx.serializeUnsignedData(), neo, acct)
  tx.sigs = Array.isArray(tx.sigs) ? tx.sigs : []
  tx.sigs.push(
    await createSdkTxSignature(1, [await createSdkPublicKey(publicKeyHex)], ['01' + signature])
  )
  return tx
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
