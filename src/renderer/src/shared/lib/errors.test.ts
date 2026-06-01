import { describe, expect, it } from 'vitest'

import {
  createAppError,
  getDefaultErrorKeyForCategory,
  mapNetworkError,
  mapSigningError,
  mapStorageError,
  mapUnknownError,
} from './errors'

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
})
