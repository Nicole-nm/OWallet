import { buildClaimOng, buildNativeTransfer, buildOep4Transfer } from './assetBuilder'
import {
  signTransactionWithPrivateKey as signTransactionWithPrivateKeySdk,
  tryDecryptWallet,
} from '../../shared/chain/transactionSdk'
import { reverseHex } from '../../shared/chain/sdkHex'
import { toSdkTransactionResponse } from '../../shared/chain/sdkBoundary'
import { sendTx } from './signingService'
import { serializeTx } from './serializationService'
import { mapTransactionFailureResponse } from './transactionFailureMapper'
import type { SdkPrivateKeyLike, SdkTransactionLike } from '../../shared/chain/types'
import { createLogger } from '../../shared/lib/logger'
import type { ScryptParams, TransferParams, WalletSigner } from '../../shared/lib/types'
import type { SendTransactionResult } from './types'

const logger = createLogger('transactionDomainService')

export async function createTransferTransaction({
  transfer,
  fromAddress,
}: {
  transfer: TransferParams
  fromAddress: string
}) {
  const gasPrice = String(transfer.gasPrice)
  const gasLimit = String(transfer.gasLimit)

  if (transfer.asset === 'ONT' || transfer.asset === 'ONG') {
    return buildNativeTransfer(
      transfer.asset,
      fromAddress,
      transfer.to,
      transfer.amount,
      fromAddress,
      gasPrice,
      gasLimit
    )
  }

  return buildOep4Transfer(
    transfer.scriptHash || '',
    fromAddress,
    transfer.to,
    transfer.amount,
    transfer.decimal || 0,
    fromAddress,
    gasPrice,
    gasLimit
  )
}

export async function createRedeemTransaction({
  address,
  claimableOng,
  gasPrice,
  gasLimit,
}: {
  address: string
  claimableOng: number | string
  gasPrice: number | string
  gasLimit: number | string
}) {
  return buildClaimOng(address, claimableOng, String(gasPrice), String(gasLimit))
}

export async function sendTransaction(tx: SdkTransactionLike): Promise<SendTransactionResult> {
  try {
    const response = toSdkTransactionResponse(await sendTx(tx))
    if (response?.Error === 0) {
      return {
        ok: true,
        response,
        txHash: reverseHex(tx.getHash()),
      }
    }

    return mapTransactionFailureResponse(response)
  } catch (err: unknown) {
    logger.error('sendTransaction', err)
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err) || null,
    }
  }
}

export function decryptWalletPrivateKey({
  wallet,
  password,
  scrypt,
}: {
  wallet: WalletSigner & { key: string; address: string; salt: string }
  password: string
  scrypt?: ScryptParams
}) {
  return tryDecryptWallet(wallet, password, scrypt)
}

export async function applyPrivateKeyTransactionSignature({
  tx,
  privateKey,
}: {
  tx: SdkTransactionLike
  privateKey: SdkPrivateKeyLike | unknown
}) {
  await signTransactionWithPrivateKeySdk(tx, privateKey)
  return tx
}

export function getTransactionHash(tx: SdkTransactionLike) {
  return reverseHex(tx.getHash())
}

export function serializeTransaction(tx: SdkTransactionLike) {
  return serializeTx(tx, 'transaction.serializeTransaction')
}
