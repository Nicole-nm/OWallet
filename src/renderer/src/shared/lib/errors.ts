import type { AppErrorCode, AppErrorPayload, ErrorCategory } from './result/types'

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
