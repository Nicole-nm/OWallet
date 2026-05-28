import {
  countSerializedSharedTransactionSignatures as countSerializedSharedTransactionSignaturesFromDomain,
  createSerializedSharedInvokeTransaction as createSerializedSharedInvokeTransactionFromDomain,
  prepareSharedTransferDraft,
  sendSerializedSharedTransaction as sendSerializedSharedTransactionFromDomain,
  signSerializedSharedTransaction as signSerializedSharedTransactionFromDomain,
  signSharedTransactionDraft,
  submitCreatedSharedTransfer,
  submitPendingSharedSignature as submitPendingSharedSignatureFromDomain,
} from '../../../domains/sharedWallet/applicationService'
import { validateWalletAddress } from '../../../domains/wallet/accountService'

import type { CreatedSharedTransferResult } from '../../../domains/sharedWallet/sharedWalletDraftService'
import type {
  PendingSharedSignatureResult,
  SharedWalletSendResult,
} from '../../../domains/sharedWallet/sharedWalletSigningService'
import type { SharedWallet } from '../../../shared/lib/types'
import type {
  PendingSharedTransfer,
  SharedWalletSession,
  SharedWalletSigner,
} from '../../../shared/types'

type SharedTransferPayload = Record<string, unknown> & {
  coPayers?: unknown[]
}
type SharedTransferFailure = { ok: false; messageKey?: string; cancelled?: boolean }
type CreateSharedTransferResult = CreatedSharedTransferResult | SharedTransferFailure

export function validateSharedTransferAddress(address: string) {
  return validateWalletAddress(address)
}

export async function createAndSubmitSharedTransfer({
  network,
  sharedWallet,
  transfer,
  redeem,
  sponsorWallet,
  password,
}: {
  network: string
  sharedWallet: SharedWallet | SharedWalletSession
  transfer: SharedTransferPayload
  redeem: Record<string, unknown>
  sponsorWallet: SharedWalletSigner
  password?: string
}): Promise<CreateSharedTransferResult> {
  const draft = await prepareSharedTransferDraft({
    sharedWallet: sharedWallet as SharedWallet,
    transfer,
    redeem,
  })
  const signedTx = await signSharedTransactionDraft({
    tx: draft.tx,
    sharedWallet: sharedWallet as SharedWallet,
    wallet: sponsorWallet,
    password: sponsorWallet.type === 'CommonWallet' ? password : undefined,
    isFirstSign: true,
  })

  if (!signedTx) {
    return sponsorWallet.type === 'CommonWallet'
      ? { ok: false, messageKey: 'common.pwdErr' }
      : { ok: false, cancelled: true }
  }

  return submitCreatedSharedTransfer({
    network,
    sharedWallet: sharedWallet as SharedWallet,
    transfer,
    payers: (transfer.coPayers || []) as Record<string, unknown>[],
    draft: {
      ...draft,
      tx: signedTx,
    },
  })
}

export function submitPendingSharedTransferSignature({
  network,
  pendingTx,
  currentSigner,
  password,
}: {
  network: string
  pendingTx: PendingSharedTransfer
  currentSigner: SharedWalletSigner
  password?: string
}): Promise<PendingSharedSignatureResult> {
  return submitPendingSharedSignatureFromDomain({
    network,
    pendingTx,
    currentSigner,
    password,
  })
}

export function signSerializedSharedTransaction({
  serializedTx,
  sharedWallet,
  wallet,
  password,
  isFirstSign = false,
}: {
  serializedTx: string
  sharedWallet: SharedWallet | SharedWalletSession
  wallet: SharedWalletSigner
  password?: string
  isFirstSign?: boolean
}) {
  return signSerializedSharedTransactionFromDomain({
    serializedTx,
    sharedWallet: sharedWallet as SharedWallet,
    wallet,
    password,
    isFirstSign,
  })
}

export function createSerializedSharedInvokeTransaction({
  sharedWalletAddress,
  contractHash,
  method,
  parameters,
}: {
  sharedWalletAddress: string
  contractHash: string
  method: string
  parameters: string
}) {
  return createSerializedSharedInvokeTransactionFromDomain({
    sharedWalletAddress,
    contractHash,
    method,
    parameters,
  })
}

export function countSerializedSharedTransactionSignatures(serializedTx: string) {
  return countSerializedSharedTransactionSignaturesFromDomain(serializedTx)
}

export function sendSerializedSharedTransaction(
  serializedTx: string
): Promise<SharedWalletSendResult> {
  return sendSerializedSharedTransactionFromDomain(serializedTx)
}
