/**
 * SharedWallet domain — public API re-export facade.
 *
 * Draft creation logic lives in sharedWalletDraftService.ts.
 * Signing and submission logic lives in sharedWalletSigningService.ts.
 */

export type { SharedTransactionDraft } from './sharedWalletDraftService'
export {
  createSharedWallet,
  querySharedWallet,
  createSharedTransfer,
  queryPendingTransfer,
  prepareSharedTransferDraft,
  submitCreatedSharedTransfer,
  createSerializedSharedInvokeTransaction,
} from './sharedWalletDraftService'

export type { SignatureCollectionState } from './sharedWalletSigningService'
export {
  signSharedTransactionDraft,
  signSerializedSharedTransaction,
  sendSerializedSharedTransaction,
  countSerializedSharedTransactionSignatures,
  submitPendingSharedSignature,
} from './sharedWalletSigningService'
