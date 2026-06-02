import { describe, expect, it } from 'vitest'

import {
  classifyError,
  createAppError,
  getDefaultErrorKeyForCategory,
  mapHttpError,
  mapLedgerError,
  mapNetworkError,
  mapSigningError,
  mapStorageError,
  mapUnknownError,
} from './errors'
import { LedgerSigningError, type LedgerErrorCode } from './ledgerError'

describe('shared/lib/errors', () => {
  it('creates app errors with category defaults', () => {
    expect(createAppError({ category: 'storage' })).toMatchObject({
      category: 'storage',
      code: 'storage.unavailable',
      errorKey: 'common.savedbFailed',
      level: 'error',
    })
  })

  it('maps timeout-like network failures to a retryable timeout error', () => {
    expect(mapNetworkError(new Error('request timed out'))).toMatchObject({
      category: 'timeout',
      code: 'timeout.request',
      errorKey: 'common.requestTimeout',
      retryable: true,
    })
  })

  it('maps cancelled signing failures to warning-level cancelled errors', () => {
    expect(mapSigningError(new Error('user rejected'))).toMatchObject({
      category: 'cancelled',
      errorKey: 'common.rejectedByUser',
      level: 'warning',
      retryable: false,
    })
  })

  it('maps storage failures to storage metadata', () => {
    expect(mapStorageError(new Error('db missing'))).toMatchObject({
      category: 'storage',
      errorKey: 'common.savedbFailed',
      retryable: true,
    })
  })

  it('maps IPC timeout errors with a specific code', () => {
    const error = Object.assign(new Error('slow'), { name: 'OWalletIpcTimeoutError' })

    expect(mapUnknownError(error)).toMatchObject({
      category: 'timeout',
      code: 'timeout.ipc',
      errorKey: 'common.requestTimeout',
      retryable: true,
    })
  })

  it('returns default keys by category', () => {
    expect(getDefaultErrorKeyForCategory('permission')).toBe('common.permissionDenied')
    expect(getDefaultErrorKeyForCategory()).toBeUndefined()
  })

  it('honors overrides for code, errorKey, and level when creating app errors', () => {
    expect(
      createAppError({
        category: 'network',
        code: 'network.http_error',
        errorKey: 'override.key',
        detail: 'why',
        cause: 'because',
        retryable: false,
        level: 'warning',
      })
    ).toEqual({
      category: 'network',
      code: 'network.http_error',
      errorKey: 'override.key',
      detail: 'why',
      cause: 'because',
      retryable: false,
      level: 'warning',
    })
  })

  it('maps AbortError instances to a timeout failure', () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' })
    expect(mapNetworkError(error)).toMatchObject({
      category: 'timeout',
      code: 'timeout.request',
      retryable: true,
    })
  })

  it('maps IPC timeout errors inside mapNetworkError to the ipc timeout code', () => {
    const error = Object.assign(new Error('ipc timed out'), { name: 'OWalletIpcTimeoutError' })
    expect(mapNetworkError(error)).toMatchObject({
      category: 'timeout',
      code: 'timeout.ipc',
      retryable: true,
    })
  })

  it('maps generic http failures to a retryable network http_error', () => {
    expect(mapNetworkError(new Error('http 500'))).toMatchObject({
      category: 'network',
      code: 'network.http_error',
      retryable: true,
    })
  })

  it('maps non-timeout, non-http errors to a generic network failure', () => {
    expect(mapNetworkError(new Error('boom'))).toMatchObject({
      category: 'network',
      code: 'network.request_failed',
      retryable: true,
    })
  })

  it('extracts string error messages into the detail field', () => {
    expect(mapNetworkError('plain string error')).toMatchObject({
      detail: 'plain string error',
    })
  })

  it('leaves the detail undefined when the error is not a string or {message}', () => {
    expect(mapNetworkError(42)).toMatchObject({ detail: undefined })
  })

  it('maps generic signing failures to a retryable signing failure', () => {
    expect(mapSigningError(new Error('hardware fault'))).toMatchObject({
      category: 'signing',
      code: 'signing.failed',
      retryable: true,
    })
  })

  it('routes network/fetch keywords through mapNetworkError in mapUnknownError', () => {
    expect(mapUnknownError(new Error('fetch fell over'))).toMatchObject({
      category: 'network',
    })
  })

  it('maps AbortError instances inside mapUnknownError to a timeout failure', () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' })
    expect(mapUnknownError(error)).toMatchObject({
      category: 'timeout',
      code: 'timeout.request',
    })
  })

  it('falls back to an unknown category when nothing else matches', () => {
    expect(mapUnknownError(new Error('mystery'))).toMatchObject({
      category: 'unknown',
      code: 'unknown.unexpected',
      retryable: false,
    })
  })

  describe('mapLedgerError', () => {
    const cases: Array<{
      code: LedgerErrorCode
      expected: { category: string; errorKey: string; level?: 'warning' | 'error' }
    }> = [
      {
        code: 'user_rejected',
        expected: {
          category: 'cancelled',
          errorKey: 'common.rejectedByUser',
          level: 'warning',
        },
      },
      {
        code: 'app_closed',
        expected: { category: 'signing', errorKey: 'ledgerWallet.appClosed' },
      },
      {
        code: 'tx_too_big',
        expected: { category: 'signing', errorKey: 'ledgerWallet.transactionTooBig' },
      },
      {
        code: 'tx_parse_error',
        expected: { category: 'signing', errorKey: 'ledgerWallet.transactionParseError' },
      },
      {
        code: 'ins_not_supported',
        expected: { category: 'signing', errorKey: 'ledgerWallet.unsupportedAppVersion' },
      },
      {
        code: 'unsupported_app_version',
        expected: { category: 'signing', errorKey: 'ledgerWallet.unsupportedAppVersion' },
      },
      {
        code: 'no_signature_returned',
        expected: { category: 'signing', errorKey: 'ledgerWallet.noSignatureReturned' },
      },
      {
        code: 'device_locked',
        expected: { category: 'signing', errorKey: 'ledgerWallet.deviceLocked' },
      },
      {
        code: 'device_disconnected',
        expected: { category: 'signing', errorKey: 'ledgerWallet.disconnected' },
      },
      {
        code: 'transport_unknown',
        expected: { category: 'signing', errorKey: 'ledgerWallet.signFailed' },
      },
    ]

    for (const { code, expected } of cases) {
      it(`maps Ledger code '${code}' to the right payload`, () => {
        const ledgerError = new LedgerSigningError(code, { statusCode: 0x6985 })
        const payload = mapLedgerError(ledgerError)
        expect(payload).toMatchObject(expected)
        expect(payload.cause).toBe(ledgerError)
      })
    }
  })

  describe('mapHttpError', () => {
    it('maps 401 to permission denied', () => {
      expect(mapHttpError(new Error('HTTP 401'))).toMatchObject({
        category: 'permission',
        code: 'permission.denied',
        retryable: false,
      })
    })

    it('maps 403 to permission denied', () => {
      expect(mapHttpError(Object.assign(new Error('forbidden'), { status: 403 }))).toMatchObject({
        category: 'permission',
      })
    })

    it('maps 5xx to retryable server error', () => {
      expect(mapHttpError(new Error('HTTP 500'))).toMatchObject({
        category: 'network',
        code: 'network.server_error',
        errorKey: 'common.serverError',
        retryable: true,
      })
    })

    it('falls back to generic http_error for other statuses', () => {
      expect(mapHttpError(new Error('HTTP 404'))).toMatchObject({
        category: 'network',
        code: 'network.http_error',
      })
    })

    it('reads numeric status off the error object when no message status is present', () => {
      expect(mapHttpError({ status: 502 })).toMatchObject({ code: 'network.server_error' })
    })
  })

  describe('classifyError', () => {
    it('dispatches LedgerSigningError to mapLedgerError', () => {
      const payload = classifyError(new LedgerSigningError('user_rejected'))
      expect(payload).toMatchObject({
        category: 'cancelled',
        errorKey: 'common.rejectedByUser',
        level: 'warning',
      })
    })

    it('classifies timeout errors before http errors', () => {
      const error = Object.assign(new Error('timed out'), { name: 'OWalletRequestTimeoutError' })
      expect(classifyError(error)).toMatchObject({
        category: 'timeout',
        code: 'timeout.request',
      })
    })

    it('classifies HTTP errors via mapHttpError', () => {
      expect(classifyError(new Error('HTTP 503'))).toMatchObject({
        category: 'network',
        code: 'network.server_error',
      })
    })

    it('classifies user-rejection messages without a typed error as cancelled', () => {
      expect(classifyError(new Error('user rejected the signature'))).toMatchObject({
        category: 'cancelled',
        level: 'warning',
      })
    })

    it('falls back to unknown for unrecognised errors', () => {
      expect(classifyError(new Error('mystery'))).toMatchObject({
        category: 'unknown',
        code: 'unknown.unexpected',
      })
    })

    it('preserves the original cause on the payload', () => {
      const cause = new Error('original')
      expect(classifyError(cause).cause).toBe(cause)
    })
  })
})
