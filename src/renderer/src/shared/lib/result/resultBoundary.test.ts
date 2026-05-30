import { beforeEach, describe, expect, it, vi } from 'vitest'

const notifyError = vi.hoisted(() => vi.fn())
const messageError = vi.hoisted(() => vi.fn())
const loggerError = vi.hoisted(() => vi.fn())
const hideRuntimeLoading = vi.hoisted(() => vi.fn())

vi.mock('../../ui/feedback', () => ({ notifyError }))
vi.mock('../../../lang', () => ({ default: { global: { t: (key: string) => key } } }))
vi.mock('ant-design-vue', () => ({ message: { error: messageError } }))
vi.mock('../logger', () => ({ logger: { error: loggerError } }))
vi.mock('../runtimeFeedback', () => ({ hideRuntimeLoading }))

import { normalizeMutationResult } from './normalizeMutation'
import { handleWorkflowError, withWorkflowBoundary } from './workflowBoundary'
import { withErrorBoundary } from './errorBoundary'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('normalizeMutationResult', () => {
  it('treats code 0 as success', () => {
    expect(normalizeMutationResult({ code: 0 }, 'err')).toEqual({
      ok: true,
      response: { code: 0 },
    })
  })

  it('treats a non-zero code as failure with the supplied errorKey', () => {
    expect(normalizeMutationResult({ code: 5 }, 'err')).toEqual({
      ok: false,
      response: { code: 5 },
      errorKey: 'err',
    })
  })

  it('treats payloads without a code field as success', () => {
    expect(normalizeMutationResult('raw', 'err')).toEqual({ ok: true, response: 'raw' })
  })
})

describe('withWorkflowBoundary', () => {
  const logger = { error: vi.fn() }

  beforeEach(() => logger.error.mockClear())

  it('returns ok without data when the op resolves to undefined', async () => {
    const result = await withWorkflowBoundary(async () => undefined, { logger, context: 'ctx' })
    expect(result).toEqual({ ok: true })
  })

  it('wraps the resolved value in a data field', async () => {
    const result = await withWorkflowBoundary(async () => 42, { logger, context: 'ctx' })
    expect(result).toEqual({ ok: true, data: 42 })
  })

  it('logs, toasts and returns a failure result on throw', async () => {
    const boom = new Error('boom')
    const result = await withWorkflowBoundary(
      async () => {
        throw boom
      },
      { logger, context: 'ctx', errorKey: 'my.key' }
    )

    expect(result).toEqual({ ok: false, errorKey: 'my.key', error: boom })
    expect(logger.error).toHaveBeenCalledWith('ctx', boom)
    expect(notifyError).toHaveBeenCalledWith('my.key', undefined)
  })

  it('suppresses the toast when toast is false', async () => {
    await withWorkflowBoundary(
      async () => {
        throw new Error('x')
      },
      { logger, context: 'ctx', toast: false }
    )
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('passes the literal flag through to notifyError', async () => {
    await withWorkflowBoundary(
      async () => {
        throw new Error('x')
      },
      { logger, context: 'ctx', errorKey: 'literal message', literal: true }
    )
    expect(notifyError).toHaveBeenCalledWith('literal message', { literal: true })
  })
})

describe('handleWorkflowError', () => {
  it('logs, toasts and returns the failure result', () => {
    const logger = { error: vi.fn() }
    const error = new Error('nope')

    const result = handleWorkflowError({ error, logger, context: 'ctx', errorKey: 'k' })

    expect(result).toEqual({ ok: false, errorKey: 'k', error })
    expect(logger.error).toHaveBeenCalledWith('ctx', error)
    expect(notifyError).toHaveBeenCalledWith('k', undefined)
  })
})

describe('withErrorBoundary', () => {
  it('returns ok results for resolved operations', async () => {
    expect(await withErrorBoundary(async () => undefined)).toEqual({ ok: true })
    expect(await withErrorBoundary(async () => 'data')).toEqual({ ok: true, data: 'data' })
  })

  it('logs with context, hides loading and toasts on failure', async () => {
    const boom = new Error('boom')
    const result = await withErrorBoundary(
      async () => {
        throw boom
      },
      { errorKey: 'my.key', context: 'ctx' }
    )

    expect(result).toEqual({ ok: false, errorKey: 'my.key', error: boom })
    expect(loggerError).toHaveBeenCalledWith('ctx', boom)
    expect(hideRuntimeLoading).toHaveBeenCalled()
    expect(messageError).toHaveBeenCalledWith('my.key')
  })

  it('respects toast=false and hideLoading=false', async () => {
    await withErrorBoundary(
      async () => {
        throw new Error('x')
      },
      { toast: false, hideLoading: false }
    )

    expect(messageError).not.toHaveBeenCalled()
    expect(hideRuntimeLoading).not.toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalled()
  })
})
