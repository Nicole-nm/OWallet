import { afterEach, describe, expect, it, vi } from 'vitest'

import { OWalletIpcTimeoutError, withIpcTimeout } from './ipcTimeout'

describe('withIpcTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resolves sync and async operations before the timeout', async () => {
    await expect(withIpcTimeout('test:sync', 1000, () => 'ok')).resolves.toBe('ok')
    await expect(withIpcTimeout('test:async', 1000, async () => 'async-ok')).resolves.toBe(
      'async-ok'
    )
  })

  it('rejects with the shared timeout error when the operation does not settle', async () => {
    vi.useFakeTimers()
    const pending = withIpcTimeout('test:slow', 1000, () => new Promise(() => undefined))

    vi.advanceTimersByTime(1000)

    await expect(pending).rejects.toBeInstanceOf(OWalletIpcTimeoutError)
    await expect(pending).rejects.toMatchObject({
      name: 'OWalletIpcTimeoutError',
      message: '[OWallet] IPC channel "test:slow" timed out after 1000ms',
    })
  })

  it('clears the timeout after a fast operation settles', async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    await expect(withIpcTimeout('test:fast', 1000, () => 'ok')).resolves.toBe('ok')

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
