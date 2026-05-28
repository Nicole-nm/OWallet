/**
 * Discriminated union for operation results.
 * Replaces inconsistent null-return and mixed error patterns across domains.
 */
export type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; errorKey: string; detail?: string }

/** Convenience alias for void results */
export type VoidResult = { ok: true } | { ok: false; errorKey: string }

export type ServiceSuccess<T extends object = Record<never, never>> = { ok: true } & T

export type ServiceFailure<T extends object = Record<never, never>> = {
  ok: false
  errorKey: string
} & T

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
export type Err<K extends string = string> = { ok: false; errorKey: K; error?: unknown }
export type BoundaryResult<T, K extends string = string> = Ok<T> | Err<K>

export function success<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function failure<T = never>(errorKey: string, detail?: string): Result<T> {
  return detail === undefined ? { ok: false, errorKey } : { ok: false, errorKey, detail }
}

export function isOk<T>(result: Result<T>): result is { ok: true; data: T } {
  return result.ok === true
}
