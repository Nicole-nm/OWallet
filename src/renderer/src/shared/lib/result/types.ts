/**
 * Discriminated union for operation results.
 * Replaces inconsistent null-return and mixed error patterns across domains.
 */
export type ErrorCategory =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'signing'
  | 'storage'
  | 'permission'
  | 'cancelled'
  | 'unknown'

export type AppErrorCode =
  | 'network.request_failed'
  | 'network.http_error'
  | 'timeout.request'
  | 'timeout.ipc'
  | 'validation.invalid_input'
  | 'signing.failed'
  | 'storage.unavailable'
  | 'permission.denied'
  | 'operation.cancelled'
  | 'unknown.unexpected'
  | (string & {})

export interface FailureMetadata {
  category?: ErrorCategory
  code?: AppErrorCode
  detail?: string
  message?: string | null
  error?: unknown
  cause?: unknown
  retryable?: boolean
}

export interface AppErrorPayload extends FailureMetadata {
  category: ErrorCategory
  code: AppErrorCode
  errorKey: string
  level?: 'warning' | 'error'
}

export type Result<T = unknown> =
  | { ok: true; data: T }
  | ({ ok: false; errorKey: string } & FailureMetadata)

/** Convenience alias for void results */
export type VoidResult = { ok: true } | ({ ok: false; errorKey: string } & FailureMetadata)

export type ServiceSuccess<T extends object = Record<never, never>> = { ok: true } & T

export type ServiceFailure<T extends object = Record<never, never>> = {
  ok: false
  errorKey: string
} & FailureMetadata &
  T

export type ServiceResult<
  Success extends object = Record<never, never>,
  Failure extends object = Record<never, never>,
> = ServiceSuccess<Success> | ServiceFailure<Failure>

export type TransactionDraftResult<
  Tx = unknown,
  Failure extends object = Record<never, never>,
  SuccessExtra extends object = Record<never, never>,
> = ServiceResult<{ tx: Tx } & SuccessExtra, Failure>

export type Ok<T> = { ok: true } & (T extends void ? unknown : { data: T })
export type Err<K extends string = string> = { ok: false; errorKey: K } & FailureMetadata
export type BoundaryResult<T, K extends string = string> = Ok<T> | Err<K>

/**
 * Common failure payload used by transaction workflows. Lives in `shared/`
 * so application-layer helpers can share the same failure contract without an
 * upward-layer import.
 */
export interface TransactionFailureResult extends FailureMetadata {
  ok: false
  cancelled?: true
  errorKey?: string
  level?: 'warning'
}

/**
 * The result returned when signing fails (wrong password or ledger cancel).
 */
export type SigningFailureResult = TransactionFailureResult

export function success<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function failure<T = never>(
  errorKey: string,
  detail?: string,
  metadata: FailureMetadata = {}
): Result<T> {
  const payload = { ok: false as const, ...metadata, errorKey }
  return detail === undefined ? payload : { ...payload, detail }
}

export function isOk<T>(result: Result<T>): result is { ok: true; data: T } {
  return result.ok === true
}
