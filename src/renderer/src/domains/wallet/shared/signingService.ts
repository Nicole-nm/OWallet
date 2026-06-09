import { getOntPassHost, ONT_PASS_API_PATHS } from '../../../shared/lib/constants'
import httpClient from '../../../shared/network/httpClient'
import { deserializeTransaction } from '../../../shared/chain/transactionSdk'
import { reverseHex } from '../../../shared/chain/sdkHex'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import { createLogger } from '../../../shared/lib/logger'
import { classifyError, classifySigningError } from '../../../shared/lib/errors'
import type { FailureMetadata } from '../../../shared/lib/result/types'
import { sendTx } from '../../transaction/broadcast'
import { serializeTx } from '../../transaction/serializationService'
import { mapTransactionFailureResponse } from '../../transaction/transactionResults'
import type { WalletAdapter } from '../adapter'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignatureCollectionState {
  collected: number
  required: number
  signatures: string[]
}

export type SharedWalletSendFailure = {
  ok: false
  errorKey?: string
  message?: string | null
} & FailureMetadata

export type SharedWalletSendResult =
  | { ok: true; txHash: string; response: HttpBody }
  | SharedWalletSendFailure

export type PendingSharedSignatureResult =
  | { ok: true; sentToChain: false }
  | { ok: true; sentToChain: true; txHash: string; response: HttpBody }
  | (SharedWalletSendFailure & { sentToChain?: boolean; cancelled?: boolean })

// ---------------------------------------------------------------------------
// HTTP thin wrapper (signing-related, internal only)
// ---------------------------------------------------------------------------

type HttpBody = Record<string, unknown>
const logger = createLogger('sharedWalletSigningService')

interface PendingSharedTransaction extends HttpBody {
  transactionBodyHash: string
  transactionIdHash: string
}

function signSharedTransfer(network: string, body: HttpBody) {
  return httpClient.post(getOntPassHost(network) + ONT_PASS_API_PATHS.SignSharedTransfer, body, {
    silent: true,
  })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getSignatureState(tx: Pick<SdkTransactionLike, 'sigs'>): SignatureCollectionState {
  const sigRecord = tx.sigs?.[0] as { M?: number; sigData?: string[] } | undefined
  return {
    collected: sigRecord?.sigData?.length ?? 0,
    required: sigRecord?.M ?? 0,
    signatures: sigRecord?.sigData ?? [],
  }
}

function normalizeSendResponse(
  response: HttpBody,
  tx: { getHash: () => string }
): SharedWalletSendResult {
  const errorCode = Number(response?.Error)

  if (errorCode === 0) {
    return {
      ok: true,
      txHash: reverseHex(tx.getHash()),
      response,
    }
  }

  return mapTransactionFailureResponse(response)
}

function asSdkTransaction(tx: unknown): SdkTransactionLike {
  return tx as SdkTransactionLike
}

/**
 * Broadcast a fully-signed shared transaction once the signature threshold is
 * reached; otherwise report that the signature was collected but not yet sent.
 */
async function broadcastIfThresholdMet(
  signed: SdkTransactionLike
): Promise<PendingSharedSignatureResult> {
  const sigState = getSignatureState(signed)
  if (sigState.required > sigState.collected) {
    return { ok: true, sentToChain: false }
  }

  const sendResponse = (await sendTx(signed)) as unknown as HttpBody
  const sendResult = normalizeSendResponse(sendResponse, signed as { getHash: () => string })
  return { ...sendResult, sentToChain: true }
}

// ---------------------------------------------------------------------------
// Signing operations
// ---------------------------------------------------------------------------

export async function signSharedTransactionDraft({
  tx,
  adapter,
  password,
  isFirstSign = true,
}: {
  tx: unknown
  adapter: WalletAdapter
  password?: string
  isFirstSign?: boolean
}) {
  const ctx = { password, isFirstSignature: isFirstSign }
  const signed = isFirstSign
    ? await adapter.signTransaction(asSdkTransaction(tx), ctx)
    : await adapter.addSignature(asSdkTransaction(tx), ctx)
  return signed || null
}

export async function signSerializedSharedTransaction({
  serializedTx,
  adapter,
  password,
  isFirstSign = false,
}: {
  serializedTx: string
  adapter: WalletAdapter
  password?: string
  isFirstSign?: boolean
}) {
  try {
    const tx = await deserializeTransaction(serializedTx)
    let signed: unknown
    try {
      signed = await signSharedTransactionDraft({
        tx,
        adapter,
        password,
        isFirstSign,
      })
    } catch (error: unknown) {
      logger.error('signSerializedSharedTransaction.sign', error)
      const payload = classifySigningError(error)
      return { ok: false, ...payload }
    }

    if (!signed) {
      return adapter.capabilities.requiresPassword
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, cancelled: true }
    }

    return {
      ok: true,
      serializedTx: serializeTx(
        asSdkTransaction(signed),
        'sharedWallet.signSerializedSharedTransaction.serialize'
      ),
    }
  } catch (error: unknown) {
    logger.error('signSerializedSharedTransaction', error)
    const payload = classifyError(error)
    return { ok: false, ...payload }
  }
}

export async function sendSerializedSharedTransaction(
  serializedTx: string
): Promise<SharedWalletSendResult> {
  try {
    const tx = await deserializeTransaction(serializedTx)
    const response = (await sendTx(asSdkTransaction(tx))) as unknown as HttpBody
    return normalizeSendResponse(response, tx)
  } catch (error: unknown) {
    logger.error('sendSerializedSharedTransaction', error)
    const payload = classifyError(error)
    return { ok: false, ...payload }
  }
}

export async function countSerializedSharedTransactionSignatures(
  serializedTx: string
): Promise<number> {
  const tx = await deserializeTransaction(serializedTx)
  return tx.sigs[0]?.sigData?.length || 0
}

export async function submitPendingSharedSignature({
  network,
  pendingTx,
  adapter,
  signedAddress,
  password,
}: {
  network: string
  pendingTx: PendingSharedTransaction
  adapter: WalletAdapter
  signedAddress: string
  password?: string
}): Promise<PendingSharedSignatureResult> {
  try {
    if (!pendingTx.transactionBodyHash || !pendingTx.transactionIdHash) {
      throw new Error('Pending shared transaction hash payload is missing')
    }

    const tx = await deserializeTransaction(pendingTx.transactionBodyHash)
    if (!tx.sigs?.[0]) {
      throw new Error('Shared transaction signature payload is missing')
    }

    let signed: unknown
    try {
      signed = await adapter.addSignature(asSdkTransaction(tx), {
        password,
        isFirstSignature: false,
      })
    } catch (error: unknown) {
      logger.error('submitPendingSharedSignature.sign', error)
      const payload = classifySigningError(error)
      return { ok: false, ...payload }
    }

    if (!signed) {
      return adapter.capabilities.requiresPassword
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, errorKey: 'ledgerWallet.signFailed' }
    }

    const signResponse = (await signSharedTransfer(network, {
      transactionIdHash: pendingTx.transactionIdHash,
      signedAddress,
      signedHash: serializeTx(
        asSdkTransaction(signed),
        'sharedWallet.submitPendingSharedSignature.serialize'
      ),
    })) as HttpBody

    if (signResponse && signResponse.Error && signResponse.Error !== 0) {
      return { ok: false, message: String(signResponse.Desc || signResponse.Result || '') || null }
    }

    return broadcastIfThresholdMet(asSdkTransaction(signed))
  } catch (error: unknown) {
    logger.error('submitPendingSharedSignature', error)
    const payload = classifyError(error)
    return { ok: false, ...payload }
  }
}
