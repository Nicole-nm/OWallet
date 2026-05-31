import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { runRefreshTasks } from './refreshHelper'

describe('shared/lib/refreshHelper', () => {
  it('returns mixed success and failure details for named refresh tasks', async () => {
    const error = new Error('second failed')
    const onFailure = vi.fn()

    await expect(
      runRefreshTasks({
        tasks: [
          { name: 'first', run: () => 'ok' },
          {
            name: 'second',
            run: async () => {
              throw error
            },
          },
        ],
        onFailure,
      })
    ).resolves.toMatchObject({
      ok: false,
      skipped: false,
      successCount: 1,
      failureCount: 1,
      failures: [{ name: 'second', reason: error }],
    })
    expect(onFailure).toHaveBeenCalledWith([{ name: 'second', reason: error }])
  })

  it('uses requestStart as a cleanup-safe in-flight guard', async () => {
    const requestStart = ref(false)
    const onFinally = vi.fn()
    let resolveTask!: (value: string) => void

    const firstRun = runRefreshTasks({
      requestStart,
      tasks: [
        {
          name: 'slow',
          run: () =>
            new Promise<string>((resolve) => {
              resolveTask = resolve
            }),
        },
      ],
      onFinally,
    })

    expect(requestStart.value).toBe(true)
    await expect(runRefreshTasks({ requestStart, tasks: [] })).resolves.toMatchObject({
      ok: true,
      skipped: true,
    })

    resolveTask('done')
    await expect(firstRun).resolves.toMatchObject({ ok: true, successCount: 1 })
    expect(requestStart.value).toBe(false)
    expect(onFinally).toHaveBeenCalledTimes(1)
  })
})
