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
})
