import type { SdkTransactionLike, SdkTransactionResponseLike, SdkJsonAccountLike } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

export function isSdkTransactionLike(value: unknown): value is SdkTransactionLike {
  return Boolean(
    isRecord(value) &&
    typeof value.serializeUnsignedData === 'function' &&
    typeof value.serialize === 'function' &&
    typeof value.getHash === 'function'
  )
}

export function assertSdkTransactionLike(
  value: unknown,
  context = 'SDK transaction builder'
): SdkTransactionLike {
  if (!isSdkTransactionLike(value)) {
    throw new Error(`[OWallet] ${context} returned an invalid SDK transaction`)
  }

  return value
}

export function invokeSdkTransactionBuilder(
  builder: unknown,
  method: string,
  args: unknown[],
  context = method
): SdkTransactionLike {
  if (!isRecord(builder) || typeof builder[method] !== 'function') {
    throw new Error(`[OWallet] SDK transaction builder is missing method "${method}"`)
  }

  return assertSdkTransactionLike(builder[method](...args), context)
}

/**
 * Re-narrows a raw `sendRawTransaction` REST envelope into the loosely-typed
 * shape the transaction layer consumes. The REST proxy types `Result` as a
 * structured object, but `sendrawtransaction` actually returns a plain string
 * payload, so the narrowing happens here at the SDK boundary rather than via an
 * `as unknown as` cast at the call site. Non-object values collapse to `{}`,
 * preserving the previous behavior where missing fields fall through to the
 * failure mapper.
 */
export function toSdkTransactionResponse(value: unknown): SdkTransactionResponseLike {
  return (isRecord(value) ? value : {}) as SdkTransactionResponseLike
}

/**
 * Re-narrows an SDK `Account.toJsonObj()` result (typed as the opaque `Account`
 * class by the SDK, but a plain JSON object at runtime) into the loosely-typed
 * shape used for persistence, keeping the unsafe cast at the SDK boundary.
 */
export function toSdkJsonAccount(value: unknown): SdkJsonAccountLike {
  return (isRecord(value) ? value : {}) as SdkJsonAccountLike
}
