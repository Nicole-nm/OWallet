import { afterEach, describe, expect, it, vi } from 'vitest'

import { runWithIpcTimeout } from './ipcTimeout'
import { OWalletIpcTimeoutError } from '../../shared-types/ipcTimeout'

describe('runWithIpcTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the operation result before the timeout elapses', async () => {
    await expect(runWithIpcTimeout('test:fast', 1000, () => 'ok')).resolves.toBe('ok')
  })

  it('rejects when the operation does not settle before the timeout', async () => {
    vi.useFakeTimers()
    const pending = runWithIpcTimeout('test:slow', 1000, () => new Promise(() => undefined))

    vi.advanceTimersByTime(1000)

    await expect(pending).rejects.toBeInstanceOf(OWalletIpcTimeoutError)
    await expect(pending).rejects.toThrow('test:slow')
  })

  it('registers IPC handlers through the shared timeout wrapper', async () => {
    vi.useFakeTimers()
    const handlers: Record<string, (...args: unknown[]) => unknown> = {}
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers[channel] = handler
      }),
    }
    const { registerIpcHandlerWithTimeout } = await import('./ipcTimeout')

    registerIpcHandlerWithTimeout(
      ipcMain as never,
      'test:wrapped',
      () => {
        return new Promise(() => undefined)
      },
      1000
    )

    const pending = handlers['test:wrapped']?.(null) as Promise<unknown>
    vi.advanceTimersByTime(1000)

    await expect(pending).rejects.toBeInstanceOf(OWalletIpcTimeoutError)
  })
})
