import { getOntPassHost, ONT_PASS_API_PATHS } from '../../shared/lib/constants'
import httpClient from '../../shared/network/httpClient'
import { deserializeTransaction } from '../../shared/chain/transactionSdk'
import { reverseHex } from '../../shared/chain/sdkHex'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { sendTx } from '../transaction/signingService'
import { serializeTx } from '../transaction/serializationService'
import type { WalletAdapter } from '../wallet/adapter'

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
  detail?: string
}

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

interface PendingSharedTransaction extends HttpBody {
  transactionbodyhash: string
  transactionidhash: string
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
  const detail = String(response?.Result || '')
  const errorCode = Number(response?.Error)

  if (errorCode === 0) {
    return {
      ok: true,
      txHash: reverseHex(tx.getHash()),
      response,
    }
  }

  if (detail.includes('balance insufficient')) {
    return { ok: false, errorKey: 'common.balanceInsufficient', detail }
  }

  if (errorCode === -1 || detail.includes('cover gas cost')) {
    return { ok: false, errorKey: 'common.ongNoEnough', detail }
  }

  return { ok: false, message: detail || null, detail }
}

function asSdkTransaction(tx: unknown): SdkTransactionLike {
  return tx as SdkTransactionLike
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
  const tx = await deserializeTransaction(serializedTx)
  const signed = await signSharedTransactionDraft({
    tx,
    adapter,
    password,
    isFirstSign,
  })

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
}

export async function sendSerializedSharedTransaction(
  serializedTx: string
): Promise<SharedWalletSendResult> {
  try {
    const tx = await deserializeTransaction(serializedTx)
    const response = (await sendTx(asSdkTransaction(tx))) as unknown as HttpBody
    return normalizeSendResponse(response, tx)
  } catch {
    return { ok: false, errorKey: 'common.networkErr' }
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
  password,
}: {
  network: string
  pendingTx: PendingSharedTransaction
  adapter: WalletAdapter
  password?: string
}): Promise<PendingSharedSignatureResult> {
  try {
    const tx = await deserializeTransaction(pendingTx.transactionbodyhash)
    if (!tx.sigs?.[0]) {
      throw new Error('Shared transaction signature payload is missing')
    }

    const signed = await adapter.addSignature(asSdkTransaction(tx), {
      password,
      isFirstSignature: false,
    })

    if (!signed) {
      return adapter.capabilities.requiresPassword
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, errorKey: 'ledgerWallet.signFailed' }
    }

    const signResponse = (await signSharedTransfer(network, {
      transactionIdHash: pendingTx.transactionidhash,
      signedAddress: adapter.identity.address,
      signedHash: serializeTx(
        asSdkTransaction(signed),
        'sharedWallet.submitPendingSharedSignature.serialize'
      ),
    })) as HttpBody

    if (signResponse && signResponse.Error && signResponse.Error !== 0) {
      return { ok: false, message: String(signResponse.Desc || signResponse.Result || '') || null }
    }

    const sigState = getSignatureState(asSdkTransaction(signed))
    if (sigState.required <= sigState.collected) {
      const sendResponse = (await sendTx(asSdkTransaction(signed))) as unknown as HttpBody
      const sendResult = normalizeSendResponse(sendResponse, signed as { getHash: () => string })
      return sendResult.ok
        ? { ...sendResult, sentToChain: true }
        : { ...sendResult, sentToChain: true }
    }

    return { ok: true, sentToChain: false }
  } catch {
    return { ok: false, errorKey: 'common.networkErr' }
  }
}
