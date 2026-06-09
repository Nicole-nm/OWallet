/**
 * Multi-sig (shared wallet) signing. CommonWallet cosigners delegate to the
 * SDK's multi-sig builder; Ledger cosigners delegate to {@link signSharedTxWithLedger}.
 */

import { signTransactionMultiSig, tryDecryptWallet } from '../../../shared/chain/transactionSdk'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import type { WalletSigner } from '../../../shared/lib/types'
import { signSharedTxWithLedger } from './ledgerSigning'

type EncryptedWallet = WalletSigner & { key: string; address: string; salt: string }

/**
 * Add a CommonWallet cosigner signature to a shared transaction. Returns
 * `undefined` when decryption fails.
 */
export async function signSharedTx(
  tx: SdkTransactionLike,
  M: number,
  publicKeys: string[],
  wallet: WalletSigner,
  password?: string
): Promise<SdkTransactionLike | undefined> {
  const privateKey = await tryDecryptWallet(wallet as EncryptedWallet, password || '')
  if (!privateKey) return undefined
  await signTransactionMultiSig(tx, M, publicKeys, privateKey)
  return tx
}

export { signSharedTxWithLedger }
