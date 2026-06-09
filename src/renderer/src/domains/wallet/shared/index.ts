/**
 * SharedWallet domain — public API re-export facade.
 *
 * Draft creation logic lives in sharedWalletDraftService.ts.
 * Signing and submission logic lives in sharedWalletSigningService.ts.
 */

export type { SharedTransactionDraft } from './draftService'
export {
  createSharedWallet,
  querySharedWallet,
  createSharedTransfer,
  queryPendingTransfer,
  prepareSharedTransferDraft,
  submitCreatedSharedTransfer,
  createSerializedSharedInvokeTransaction,
} from './draftService'

export type { SignatureCollectionState } from './signingService'
export {
  signSharedTransactionDraft,
  signSerializedSharedTransaction,
  sendSerializedSharedTransaction,
  countSerializedSharedTransactionSignatures,
  submitPendingSharedSignature,
} from './signingService'
