interface CodedResponse {
  code: number
  [key: string]: unknown
}

export type NormalizedMutationResult<R = unknown> =
  | { ok: true; response: R }
  | { ok: false; response: R; errorKey: string }

/**
 * Mutation endpoints in this codebase return either a `{ code, ... }` envelope
 * (where `code === 0` is success) or a raw payload that should be treated as
 * success. Collapse both into the standard `{ ok, response, errorKey? }` shape.
 */
export function normalizeMutationResult<R = unknown>(
  response: R,
  errorKey: string
): NormalizedMutationResult<R> {
  if (response && typeof response === 'object' && 'code' in response) {
    return (response as CodedResponse).code === 0
      ? { ok: true, response }
      : { ok: false, response, errorKey }
  }

  return { ok: true, response }
}
