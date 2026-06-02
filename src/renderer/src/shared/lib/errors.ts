import type { AppErrorCode, AppErrorPayload, ErrorCategory } from './result/types'
import { LedgerSigningError, type LedgerErrorCode } from './ledgerError'

const DEFAULT_ERROR_KEYS: Record<ErrorCategory, string> = {
  network: 'common.networkErr',
  timeout: 'common.requestTimeout',
  validation: 'common.invalidInput',
  signing: 'ledgerWallet.signFailed',
  storage: 'common.savedbFailed',
  permission: 'common.permissionDenied',
  cancelled: 'common.rejectedByUser',
  unknown: 'common.unexpectedError',
}

const DEFAULT_ERROR_CODES: Record<ErrorCategory, AppErrorCode> = {
  network: 'network.request_failed',
  timeout: 'timeout.request',
  validation: 'validation.invalid_input',
  signing: 'signing.failed',
  storage: 'storage.unavailable',
  permission: 'permission.denied',
  cancelled: 'operation.cancelled',
  unknown: 'unknown.unexpected',
}

interface AppErrorOptions {
  category: ErrorCategory
  code?: AppErrorCode
  errorKey?: string
  detail?: string
  cause?: unknown
  retryable?: boolean
  level?: 'warning' | 'error'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function getMessage(error: unknown): string | undefined {
  if (typeof error === 'string') return error
  if (isRecord(error) && typeof error.message === 'string') return error.message
  return undefined
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError'
}

function isIpcTimeoutError(error: unknown): boolean {
  return isRecord(error) && error.name === 'OWalletIpcTimeoutError'
}

function messageIncludes(error: unknown, ...needles: string[]): boolean {
  const message = getMessage(error)?.toLowerCase() || ''
  return needles.some((needle) => message.includes(needle))
}

export function getDefaultErrorKeyForCategory(category?: ErrorCategory): string | undefined {
  return category ? DEFAULT_ERROR_KEYS[category] : undefined
}

export function createAppError(options: AppErrorOptions): AppErrorPayload {
  const { category, code, errorKey, detail, cause, retryable, level = 'error' } = options
  return {
    category,
    code: code ?? DEFAULT_ERROR_CODES[category],
    errorKey: errorKey ?? DEFAULT_ERROR_KEYS[category],
    detail,
    cause,
    retryable,
    level,
  }
}

export function mapNetworkError(error: unknown): AppErrorPayload {
  if (isAbortError(error) || messageIncludes(error, 'timeout', 'timed out')) {
    return createAppError({
      category: 'timeout',
      code: isIpcTimeoutError(error) ? 'timeout.ipc' : 'timeout.request',
      cause: error,
      detail: getMessage(error),
      retryable: true,
    })
  }

  if (messageIncludes(error, 'http')) {
    return createAppError({
      category: 'network',
      code: 'network.http_error',
      cause: error,
      detail: getMessage(error),
      retryable: true,
    })
  }

  return createAppError({
    category: 'network',
    cause: error,
    detail: getMessage(error),
    retryable: true,
  })
}

export function mapSigningError(error: unknown): AppErrorPayload {
  if (messageIncludes(error, 'reject', 'cancel', 'denied')) {
    return createAppError({
      category: 'cancelled',
      cause: error,
      detail: getMessage(error),
      retryable: false,
      level: 'warning',
    })
  }

  return createAppError({
    category: 'signing',
    cause: error,
    detail: getMessage(error),
    retryable: true,
  })
}

export function mapStorageError(error: unknown): AppErrorPayload {
  return createAppError({
    category: 'storage',
    cause: error,
    detail: getMessage(error),
    retryable: true,
  })
}

export function mapUnknownError(error: unknown): AppErrorPayload {
  if (isIpcTimeoutError(error) || isAbortError(error) || messageIncludes(error, 'timeout')) {
    return createAppError({
      category: 'timeout',
      code: isIpcTimeoutError(error) ? 'timeout.ipc' : 'timeout.request',
      cause: error,
      detail: getMessage(error),
      retryable: true,
    })
  }

  if (messageIncludes(error, 'network', 'fetch', 'http')) {
    return mapNetworkError(error)
  }

  return createAppError({
    category: 'unknown',
    cause: error,
    detail: getMessage(error),
    retryable: false,
  })
}

/* -------------------------------------------------------------------------- */
/*  Ledger-specific mapping                                                   */
/* -------------------------------------------------------------------------- */

interface LedgerCodeMapping {
  category: ErrorCategory
  code: AppErrorCode
  errorKey: string
  level?: 'warning' | 'error'
}

const LEDGER_CODE_MAPPINGS: Record<LedgerErrorCode, LedgerCodeMapping> = {
  user_rejected: {
    category: 'cancelled',
    code: 'signing.user_rejected',
    errorKey: 'common.rejectedByUser',
    level: 'warning',
  },
  app_closed: {
    category: 'signing',
    code: 'signing.app_closed',
    errorKey: 'ledgerWallet.appClosed',
  },
  tx_too_big: {
    category: 'signing',
    code: 'signing.tx_too_big',
    errorKey: 'ledgerWallet.transactionTooBig',
  },
  tx_parse_error: {
    category: 'signing',
    code: 'signing.tx_parse_error',
    errorKey: 'ledgerWallet.transactionParseError',
  },
  ins_not_supported: {
    category: 'signing',
    code: 'signing.unsupported_app_version',
    errorKey: 'ledgerWallet.unsupportedAppVersion',
  },
  unsupported_app_version: {
    category: 'signing',
    code: 'signing.unsupported_app_version',
    errorKey: 'ledgerWallet.unsupportedAppVersion',
  },
  no_signature_returned: {
    category: 'signing',
    code: 'signing.no_signature_returned',
    errorKey: 'ledgerWallet.noSignatureReturned',
  },
  device_locked: {
    category: 'signing',
    code: 'signing.device_locked',
    errorKey: 'ledgerWallet.deviceLocked',
  },
  device_disconnected: {
    category: 'signing',
    code: 'signing.device_disconnected',
    errorKey: 'ledgerWallet.disconnected',
  },
  transport_unknown: {
    category: 'signing',
    code: 'signing.failed',
    errorKey: 'ledgerWallet.signFailed',
  },
}

export function mapLedgerError(error: LedgerSigningError): AppErrorPayload {
  const mapping = LEDGER_CODE_MAPPINGS[error.code] ?? LEDGER_CODE_MAPPINGS.transport_unknown
  return createAppError({
    category: mapping.category,
    code: mapping.code,
    errorKey: mapping.errorKey,
    level: mapping.level,
    cause: error,
    detail: error.message || getMessage(error.cause),
    retryable: mapping.category !== 'cancelled',
  })
}

/* -------------------------------------------------------------------------- */
/*  HTTP-aware mapping                                                        */
/* -------------------------------------------------------------------------- */

function extractHttpStatus(error: unknown): number | undefined {
  if (isRecord(error)) {
    const directStatus = error.status ?? error.statusCode ?? error.httpStatus
    if (typeof directStatus === 'number') return directStatus
  }
  const message = getMessage(error)
  if (!message) return undefined
  const match = message.match(/(?:HTTP|status)[^\d]{0,5}(\d{3})/i)
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

export function mapHttpError(error: unknown): AppErrorPayload {
  const status = extractHttpStatus(error)
  if (status === 401 || status === 403) {
    return createAppError({
      category: 'permission',
      code: 'permission.denied',
      cause: error,
      detail: getMessage(error),
      retryable: false,
    })
  }
  if (status !== undefined && status >= 500) {
    return createAppError({
      category: 'network',
      code: 'network.server_error',
      errorKey: 'common.serverError',
      cause: error,
      detail: getMessage(error),
      retryable: true,
    })
  }
  return createAppError({
    category: 'network',
    code: 'network.http_error',
    cause: error,
    detail: getMessage(error),
    retryable: true,
  })
}

function isHttpError(error: unknown): boolean {
  if (isRecord(error)) {
    const status = error.status ?? error.statusCode ?? error.httpStatus
    if (typeof status === 'number') return true
  }
  return messageIncludes(error, 'http')
}

function isTimeoutError(error: unknown): boolean {
  if (isAbortError(error) || isIpcTimeoutError(error)) return true
  if (isRecord(error) && error.name === 'OWalletRequestTimeoutError') return true
  return messageIncludes(error, 'timeout', 'timed out')
}

/* -------------------------------------------------------------------------- */
/*  Master classifier                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Classify any thrown value into an `AppErrorPayload`. Dispatch order matters:
 * typed errors (`LedgerSigningError`) take precedence, then timeout, then HTTP,
 * then signing-by-keyword, then generic unknown. Use this at any `catch` site
 * where the actual error type is not known until inspection — it preserves
 * structured info (category, code, cause) so the UI shows accurate messages
 * instead of a misleading "network error" catch-all.
 */
export function classifyError(error: unknown): AppErrorPayload {
  if (error instanceof LedgerSigningError) return mapLedgerError(error)
  if (isTimeoutError(error)) {
    return createAppError({
      category: 'timeout',
      code: isIpcTimeoutError(error) ? 'timeout.ipc' : 'timeout.request',
      cause: error,
      detail: getMessage(error),
      retryable: true,
    })
  }
  if (isHttpError(error)) return mapHttpError(error)
  if (messageIncludes(error, 'reject', 'cancel', 'denied')) return mapSigningError(error)
  return mapUnknownError(error)
}

/**
 * Classifier for catch sites that wrap a signing operation. Behaves like
 * `classifyError` but upgrades the `unknown` fallback to a generic `signing`
 * failure — preserves the semantic context of where the error was caught.
 */
export function classifySigningError(error: unknown): AppErrorPayload {
  const payload = classifyError(error)
  if (payload.category !== 'unknown') return payload
  return createAppError({
    category: 'signing',
    cause: error,
    detail: getMessage(error),
    retryable: true,
  })
}

/**
 * Decide whether the classifier's errorKey is strictly more informative than
 * the caller-provided fallback. True for Ledger/signing/cancelled/timeout/
 * permission, plus HTTP 5xx (network.server_error). False for generic
 * network/unknown — where the caller's domain hint is at least as useful.
 */
export function classifierKeyWins(payload: AppErrorPayload): boolean {
  if (payload.category === 'unknown') return false
  if (payload.category === 'network' && payload.code !== 'network.server_error') return false
  return true
}
