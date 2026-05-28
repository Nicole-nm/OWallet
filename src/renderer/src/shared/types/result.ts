// Re-export everything from the canonical result module.
// This file is kept for backward compatibility — consumers may import directly from here.
export type {
  Result,
  VoidResult,
  ServiceSuccess,
  ServiceFailure,
  ServiceResult,
  TransactionDraftResult,
} from '../lib/result'
export { success, failure, isOk } from '../lib/result'
