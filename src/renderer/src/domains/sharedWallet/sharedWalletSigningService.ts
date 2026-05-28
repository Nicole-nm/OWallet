import { getOntPassHost, ONT_PASS_API_PATHS } from '../../shared/lib/constants'
import httpClient from '../../shared/network/httpClient'
import {
  deserializeTransaction,
  signTransactionMultiSig,
  tryDecryptWallet,
} from '../../shared/chain/transactionSdk'
import { reverseHex } from '../../shared/chain/sdkHex'
import type { SdkTransactionLike } from '../../shared/chain/types'
import {
  checkPublicKeyIsInTheConnectedLedger,
  legacySignWithLedger,
} from '../../shared/chain/ledgerSigner'
import { sendTx, signSharedTx, signSharedTxWithLedger } from '../transaction/signingService'
import { serializeTx } from '../transaction/serializationService'
import type { SharedWallet, Copayer, WalletSigner } from '../../shared/lib/types'

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
  messageKey?: string
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

interface SharedSignerInput extends HttpBody {
  type?: string
  address?: string
  key?: string
  salt?: string
  publicKey?: string
  publickey?: string
  sharedWalletAddress?: string
  neo?: boolean | number
  acct?: number
  wallet?: HttpBody
}

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
    return { ok: false, messageKey: 'common.balanceInsufficient', detail }
  }

  if (errorCode === -1 || detail.includes('cover gas cost')) {
    return { ok: false, messageKey: 'common.ongNoEnough', detail }
  }

  return { ok: false, message: detail || null, detail }
}

function asSdkTransaction(tx: unknown): SdkTransactionLike {
  return tx as SdkTransactionLike
}

function normalizeSharedSigner(
  wallet: SharedSignerInput,
  sharedWalletAddress?: string
): WalletSigner & HttpBody {
  const nestedWallet = wallet.wallet && typeof wallet.wallet === 'object' ? wallet.wallet : {}
  const neo = nestedWallet.neo ?? wallet.neo
  if (wallet.type === 'CommonWallet') {
    return {
      key: String(nestedWallet.key || wallet.key || ''),
      address: String(wallet.address || ''),
      salt: String(nestedWallet.salt || wallet.salt || ''),
    } as WalletSigner & HttpBody
  }

  return {
    publicKey: String(nestedWallet.publicKey || wallet.publicKey || wallet.publickey || ''),
    address: String(wallet.address || ''),
    sharedWalletAddress: wallet.sharedWalletAddress || sharedWalletAddress,
    neo: typeof neo === 'boolean' || typeof neo === 'number' ? neo : undefined,
    acct: Number(nestedWallet.acct ?? wallet.acct ?? 0),
  }
}

// ---------------------------------------------------------------------------
// Signing operations
// ---------------------------------------------------------------------------

export async function signSharedTransactionDraft({
  tx,
  sharedWallet,
  wallet,
  password,
  isFirstSign = true,
}: {
  tx: unknown
  sharedWallet: SharedWallet
  wallet: SharedSignerInput
  password?: string
  isFirstSign?: boolean
}) {
  const M = Number(sharedWallet.requiredNumber)
  const publicKeys = sharedWallet.coPayers.map((payer: Copayer) => payer.publickey)

  if (wallet.type === 'CommonWallet') {
    const signed = await signSharedTx(
      asSdkTransaction(tx),
      M,
      publicKeys,
      normalizeSharedSigner(wallet),
      password
    )
    return signed || null
  }

  return signSharedTxWithLedger(
    asSdkTransaction(tx),
    M,
    publicKeys,
    normalizeSharedSigner(wallet, sharedWallet.sharedWalletAddress),
    isFirstSign
  )
}

export async function signSerializedSharedTransaction({
  serializedTx,
  sharedWallet,
  wallet,
  password,
  isFirstSign = false,
}: {
  serializedTx: string
  sharedWallet: SharedWallet
  wallet: SharedSignerInput
  password?: string
  isFirstSign?: boolean
}) {
  const tx = await deserializeTransaction(serializedTx)
  const signed = await signSharedTransactionDraft({
    tx,
    sharedWallet,
    wallet,
    password,
    isFirstSign,
  })

  if (!signed) {
    return wallet.type === 'CommonWallet'
      ? { ok: false, messageKey: 'common.pwdErr' }
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
    return { ok: false, messageKey: 'common.networkErr' }
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
  currentSigner,
  password,
}: {
  network: string
  pendingTx: PendingSharedTransaction
  currentSigner: SharedSignerInput
  password?: string
}): Promise<PendingSharedSignatureResult> {
  try {
    const tx = await deserializeTransaction(pendingTx.transactionbodyhash)
    if (!tx.sigs?.[0]) {
      throw new Error('Shared transaction signature payload is missing')
    }
    const M = tx.sigs[0].M
    const publicKeys = tx.sigs[0].pubKeys

    if (currentSigner.type === 'CommonWallet') {
      const privateKey = await tryDecryptWallet(
        {
          key: String(currentSigner.key || ''),
          address: String(currentSigner.address || ''),
          salt: String(currentSigner.salt || ''),
        },
        password as string
      )

      if (!privateKey) {
        return { ok: false, messageKey: 'common.pwdErr' }
      }

      await signTransactionMultiSig(asSdkTransaction(tx), M, publicKeys, privateKey)
    } else {
      try {
        await checkPublicKeyIsInTheConnectedLedger(
          currentSigner.acct,
          currentSigner.neo,
          String(currentSigner.publicKey || '')
        )
        const signature = await legacySignWithLedger(
          tx.serializeUnsignedData(),
          currentSigner.neo,
          currentSigner.acct
        )
        tx.sigs[0].sigData.push('01' + signature)
      } catch {
        return { ok: false, messageKey: 'ledgerWallet.signFailed' }
      }
    }

    const signResponse = (await signSharedTransfer(network, {
      transactionIdHash: pendingTx.transactionidhash,
      signedAddress: currentSigner.address,
      signedHash: serializeTx(
        asSdkTransaction(tx),
        'sharedWallet.submitPendingSharedSignature.serialize'
      ),
    })) as HttpBody

    if (signResponse && signResponse.Error && signResponse.Error !== 0) {
      return { ok: false, message: String(signResponse.Desc || signResponse.Result || '') || null }
    }

    const sigState = getSignatureState(tx)
    if (sigState.required <= sigState.collected) {
      const sendResponse = (await sendTx(asSdkTransaction(tx))) as unknown as HttpBody
      const sendResult = normalizeSendResponse(sendResponse, tx)
      return sendResult.ok
        ? { ...sendResult, sentToChain: true }
        : { ...sendResult, sentToChain: true }
    }

    return { ok: true, sentToChain: false }
  } catch {
    return { ok: false, messageKey: 'common.networkErr' }
  }
}
