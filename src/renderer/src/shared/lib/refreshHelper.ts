import type { Ref } from 'vue'

export interface RefreshTask<T = unknown> {
  name: string
  run: () => Promise<T> | T
}

export interface RefreshTaskFailure {
  name: string
  reason: unknown
}

export interface RefreshTasksResult<T = unknown> {
  ok: boolean
  skipped: boolean
  successCount: number
  failureCount: number
  failures: RefreshTaskFailure[]
  results: PromiseSettledResult<T>[]
}

interface RunRefreshTasksOptions<T> {
  requestStart?: Ref<boolean>
  tasks: RefreshTask<T>[]
  onStart?: () => void
  onFinally?: () => void
  onFailure?: (failures: RefreshTaskFailure[]) => void | Promise<void>
}

async function runTask<T>(task: RefreshTask<T>): Promise<T> {
  return task.run()
}

export async function runRefreshTasks<T = unknown>({
  requestStart,
  tasks,
  onStart,
  onFinally,
  onFailure,
}: RunRefreshTasksOptions<T>): Promise<RefreshTasksResult<T>> {
  if (requestStart?.value) {
    return {
      ok: true,
      skipped: true,
      successCount: 0,
      failureCount: 0,
      failures: [],
      results: [],
    }
  }

  if (requestStart) {
    requestStart.value = true
  }

  try {
    onStart?.()
    const results = await Promise.allSettled(tasks.map((task) => runTask(task)))
    const failures = results.reduce<RefreshTaskFailure[]>((acc, result, index) => {
      if (result.status === 'rejected') {
        acc.push({ name: tasks[index]?.name || `task:${index}`, reason: result.reason })
      }
      return acc
    }, [])

    if (failures.length > 0) {
      await onFailure?.(failures)
    }

    return {
      ok: failures.length === 0,
      skipped: false,
      successCount: results.length - failures.length,
      failureCount: failures.length,
      failures,
      results,
    }
  } finally {
    if (requestStart) {
      requestStart.value = false
    }
    onFinally?.()
  }
}
