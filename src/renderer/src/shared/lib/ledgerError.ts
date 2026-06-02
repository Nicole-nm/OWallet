/**
 * Typed error thrown by the Ledger transport layer. Carries the structured
 * device-state code so callers (the classifier in `errors.ts`, UI toasts)
 * can render an accurate message instead of a generic network error.
 *
 * The transport layer does NOT translate messages — translation happens once
 * at the UI boundary so we keep the raw statusCode/code/cause intact.
 */

export type LedgerErrorCode =
  | 'user_rejected' // APDU 0x6985
  | 'app_closed' // APDU 0x6e00
  | 'tx_too_big' // APDU 0x6d08
  | 'tx_parse_error' // APDU 0x6d07
  | 'ins_not_supported' // APDU 0x6d00
  | 'unsupported_app_version'
  | 'no_signature_returned'
  | 'device_locked' // LockedDeviceError from @ledgerhq/errors
  | 'device_disconnected' // DisconnectedDevice / DisconnectedDeviceDuringOperation
  | 'transport_unknown'

interface LedgerSigningErrorOptions {
  statusCode?: number
  cause?: unknown
  message?: string
}

export class LedgerSigningError extends Error {
  override readonly name = 'LedgerSigningError'
  readonly code: LedgerErrorCode
  readonly statusCode?: number
  override readonly cause?: unknown

  constructor(
    code: LedgerErrorCode,
    { statusCode, cause, message }: LedgerSigningErrorOptions = {}
  ) {
    super(message ?? `Ledger error: ${code}`)
    this.code = code
    this.statusCode = statusCode
    this.cause = cause
  }
}

export function isLedgerSigningError(error: unknown): error is LedgerSigningError {
  return error instanceof LedgerSigningError
}
