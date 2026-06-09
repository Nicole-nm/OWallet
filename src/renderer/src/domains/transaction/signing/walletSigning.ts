/**
 * CommonWallet (password-encrypted) signing primitives consumed by the wallet
 * adapters. Builds SDK signature objects through the shared `transactionSdk`
 * helpers rather than touching the raw SDK here.
 */

import {
  addTransactionSign,
  createSdkTxSignature,
  tryDecryptWallet,
} from '../../../shared/chain/transactionSdk'
import type { SdkPrivateKeyLike, SdkTransactionLike } from '../../../shared/chain/types'
import type { WalletSigner } from '../../../shared/lib/types'

type EncryptedWallet = WalletSigner & { key: string; address: string; salt: string }

function decryptSigner(wallet: WalletSigner, password?: string) {
  return tryDecryptWallet(wallet as EncryptedWallet, password || '')
}

/**
 * Sign a transaction with a decrypted CommonWallet key, replacing `tx.sigs`
 * with a single signature. Returns `undefined` when decryption fails.
 */
export async function signWithWallet(
  tx: SdkTransactionLike,
  wallet: WalletSigner,
  password?: string
): Promise<SdkTransactionLike | undefined> {
  const privateKey = (await decryptSigner(wallet, password)) as SdkPrivateKeyLike | null
  if (!privateKey) return undefined

  const legacyWallet = wallet as WalletSigner & { wallet?: { publicKey?: string } }
  const publicKeyHex =
    legacyWallet.wallet?.publicKey || wallet.publicKey || privateKey.getPublicKey().serializeHex()
  const signatureHex = privateKey.sign(tx, privateKey.algorithm?.defaultSchema).serializeHex()

  if (!publicKeyHex) {
    throw new Error('Wallet public key is unavailable')
  }
  if (!signatureHex) {
    throw new Error('Transaction signature is empty')
  }

  tx.sigs = [await createSdkTxSignature(1, [publicKeyHex], [signatureHex])]
  return tx
}

/**
 * Append an additional CommonWallet signature to a multi-sig transaction without
 * replacing existing sigs. Returns `null` when decryption fails.
 */
export async function addWalletSignature({
  tx,
  wallet,
  password,
}: {
  tx: SdkTransactionLike
  wallet: EncryptedWallet
  password: string
}): Promise<SdkTransactionLike | null> {
  const privateKey = await tryDecryptWallet(wallet, password)
  if (!privateKey) return null
  await addTransactionSign(tx, privateKey)
  return tx
}

/** Sign an arbitrary message with a decrypted CommonWallet key. */
export async function signMessageWithWallet(
  message: string,
  wallet: WalletSigner,
  password?: string
) {
  const privateKey = (await decryptSigner(wallet, password)) as SdkPrivateKeyLike | null
  if (!privateKey) return undefined
  return privateKey.sign(message)
}
