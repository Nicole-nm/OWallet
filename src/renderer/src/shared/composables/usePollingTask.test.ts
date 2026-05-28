import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePollingTask } from './usePollingTask'

describe('usePollingTask', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('runs immediately and on every polling interval after start', () => {
    const task = vi.fn()
    const polling = usePollingTask(task, { autoStart: false, intervalMs: 1000 })

    polling.startPolling()

    expect(task).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(3000)

    expect(task).toHaveBeenCalledTimes(4)
    expect(polling.isPolling.value).toBe(true)
  })

  it('can start without an immediate run and stops cleanly', () => {
    const task = vi.fn()
    const polling = usePollingTask(task, { autoStart: false, intervalMs: 1000 })

    polling.startPolling({ immediate: false })

    expect(task).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(task).toHaveBeenCalledTimes(1)

    polling.stopPolling()
    vi.advanceTimersByTime(3000)

    expect(task).toHaveBeenCalledTimes(1)
    expect(polling.isPolling.value).toBe(false)
  })
})
