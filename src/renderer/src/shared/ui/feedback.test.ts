import { beforeEach, describe, expect, it, vi } from 'vitest'

type MessageArgs = {
  content: string
  key: string
}

const mocks = vi.hoisted(() => ({
  messageError: vi.fn(),
  messageWarning: vi.fn(),
  messageSuccess: vi.fn(),
  messageInfo: vi.fn(),
  modalSuccess: vi.fn(),
  modalInfo: vi.fn(),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    error: mocks.messageError,
    warning: mocks.messageWarning,
    success: mocks.messageSuccess,
    info: mocks.messageInfo,
  },
  Modal: {
    success: mocks.modalSuccess,
    info: mocks.modalInfo,
  },
}))

vi.mock('../../lang', () => ({
  default: {
    global: {
      t: (key: string) => `T(${key})`,
    },
  },
}))

import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
  showAppError,
  showAppInfo,
  showAppSuccess,
} from './feedback'

function getCallArg<T>(fn: { mock: { calls: unknown[][] } }, index: number): T {
  return fn.mock.calls[index]?.[0] as T
}

describe('shared/ui/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses a stable message key for the same level and resolved content', () => {
    notifyError('common.networkErr')
    notifyError('common.networkErr')

    const first = getCallArg<MessageArgs>(mocks.messageError, 0)
    const second = getCallArg<MessageArgs>(mocks.messageError, 1)

    expect(first).toEqual(
      expect.objectContaining({
        content: 'T(common.networkErr)',
        key: expect.stringMatching(/^owallet-message-error-/),
      })
    )
    expect(second.key).toBe(first.key)
  })

  it('keeps message keys separate by level', () => {
    notifyError('same text', { literal: true })
    notifyWarning('same text', { literal: true })
    notifySuccess('same text', { literal: true })

    const error = getCallArg<MessageArgs>(mocks.messageError, 0)
    const warning = getCallArg<MessageArgs>(mocks.messageWarning, 0)
    const success = getCallArg<MessageArgs>(mocks.messageSuccess, 0)

    expect(error.content).toBe('same text')
    expect(warning.content).toBe('same text')
    expect(success.content).toBe('same text')
    expect(error.key).not.toBe(warning.key)
    expect(error.key).not.toBe(success.key)
    expect(warning.key).not.toBe(success.key)
  })

  it('uses stable message keys for info content', () => {
    notifyInfo('same text', { literal: true })
    notifyInfo('same text', { literal: true })

    const first = getCallArg<MessageArgs>(mocks.messageInfo, 0)
    const second = getCallArg<MessageArgs>(mocks.messageInfo, 1)

    expect(first).toEqual(
      expect.objectContaining({
        content: 'same text',
        key: expect.stringMatching(/^owallet-message-info-/),
      })
    )
    expect(second.key).toBe(first.key)
  })

  it('routes app success and info through message toast', () => {
    showAppSuccess('common.savedbSuccess', 'same detail')
    showAppSuccess('common.savedbSuccess', 'same detail')
    showAppInfo('common.savedbSuccess', 'same detail')

    const firstSuccess = getCallArg<MessageArgs>(mocks.messageSuccess, 0)
    const secondSuccess = getCallArg<MessageArgs>(mocks.messageSuccess, 1)
    const info = getCallArg<MessageArgs>(mocks.messageInfo, 0)

    expect(firstSuccess).toEqual(
      expect.objectContaining({
        content: 'T(common.savedbSuccess)',
        key: expect.stringMatching(/^owallet-message-success-/),
      })
    )
    expect(secondSuccess.key).toBe(firstSuccess.key)
    expect(info.key).not.toBe(firstSuccess.key)
  })

  it('ignores app success detail when routing to message toast', () => {
    showAppSuccess('common.savedbSuccess', 'first detail')
    showAppSuccess('common.savedbSuccess', 'second detail')

    const first = getCallArg<MessageArgs>(mocks.messageSuccess, 0)
    const second = getCallArg<MessageArgs>(mocks.messageSuccess, 1)

    expect(first.key).toBe(second.key)
  })

  it('routes classified app errors through message toast', () => {
    showAppError({
      category: 'network',
      code: 'network.request_failed',
      errorKey: 'common.networkErr',
    })

    expect(mocks.messageError).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'T(common.networkErr)',
        key: expect.stringMatching(/^owallet-message-error-/),
      })
    )
  })
})
