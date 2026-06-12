import type { Ref } from 'vue'
import { logger } from '../../shared/lib/logger'
import { classifyError } from '../../shared/lib/errors'
import type { AppErrorPayload } from '../../shared/lib/result/types'
import {
  runRefreshTasks,
  type RefreshTask,
  type RefreshTaskFailure,
  type RefreshTasksResult,
} from '../../shared/lib/refreshHelper'
import { showAppError } from '../../shared/ui/feedback'

export type WalletDashboardRefreshTask = Promise<unknown> | (() => Promise<unknown> | unknown)
export type WalletDashboardRefreshResult = Omit<RefreshTasksResult<unknown>, 'failures'> & {
  failures: unknown[]
}

interface LoadingStoreLike {
  showLoadingModals(): void
  hideLoadingModals(): void
}

interface RunWalletDashboardRefreshOptions {
  requestStart: Ref<boolean>
  showLoading: boolean
  loadingStore: LoadingStoreLike
  tasks: WalletDashboardRefreshTask[]
  errorContext?: string
}

function toRefreshTask(task: WalletDashboardRefreshTask, index: number): RefreshTask<unknown> {
  return {
    name: `dashboard:${index}`,
    run: () => (typeof task === 'function' ? task() : task),
  }
}

/**
 * Pick the most informative payload across all failed dashboard tasks. The
 * priority order favours user-actionable categories (cancelled, signing,
 * permission, timeout) over generic network/unknown so a single mid-refresh
 * Ledger rejection or timeout isn't drowned out by a string of network errors.
 * Also injects the failing task names into `detail` for logs and diagnostics.
 */
const CATEGORY_PRIORITY: Record<string, number> = {
  cancelled: 0,
  signing: 1,
  permission: 2,
  timeout: 3,
  network: 4,
  storage: 5,
  validation: 6,
  unknown: 7,
}

function isStructuredFailurePayload(reason: unknown): reason is Partial<AppErrorPayload> & {
  errorKey: string
} {
  return Boolean(
    reason &&
    typeof reason === 'object' &&
    'errorKey' in reason &&
    typeof reason.errorKey === 'string'
  )
}

function payloadForFailure(failure: RefreshTaskFailure): AppErrorPayload {
  if (isStructuredFailurePayload(failure.reason)) {
    const fallback = classifyError(failure.reason.cause ?? failure.reason)
    return {
      category: failure.reason.category ?? fallback.category,
      code: failure.reason.code ?? fallback.code,
      errorKey: failure.reason.errorKey,
      detail: failure.reason.detail ?? fallback.detail,
      cause: failure.reason.cause ?? fallback.cause,
      retryable: failure.reason.retryable ?? fallback.retryable,
      level: failure.reason.level ?? fallback.level,
    }
  }

  return classifyError(failure.reason)
}

function summariseDashboardFailures(failures: RefreshTaskFailure[]): AppErrorPayload {
  const classified = failures.map((failure) => ({
    name: failure.name,
    payload: payloadForFailure(failure),
  }))

  const dominant = classified.reduce((acc, current) => {
    const accRank = CATEGORY_PRIORITY[acc.payload.category] ?? 999
    const currentRank = CATEGORY_PRIORITY[current.payload.category] ?? 999
    return currentRank < accRank ? current : acc
  })

  const taskNames = failures.map((failure) => failure.name).join(', ')
  const baseDetail = dominant.payload.detail
  const detail = baseDetail ? `${baseDetail} — tasks: ${taskNames}` : `tasks: ${taskNames}`

  return { ...dominant.payload, detail }
}

export async function runWalletDashboardRefresh({
  requestStart,
  showLoading,
  loadingStore,
  tasks,
  errorContext = 'useWalletDashboard.refresh',
}: RunWalletDashboardRefreshOptions): Promise<WalletDashboardRefreshResult> {
  let loadingShown = false

  const result = await runRefreshTasks({
    requestStart,
    tasks: tasks.map(toRefreshTask),
    onStart: () => {
      if (showLoading) {
        loadingStore.showLoadingModals()
        loadingShown = true
      }
    },
    onFailure: (failures) => {
      for (const failure of failures) {
        logger.error(errorContext, failure.reason)
      }
      showAppError(summariseDashboardFailures(failures))
    },
    onFinally: () => {
      if (loadingShown) {
        loadingStore.hideLoadingModals()
      }
    },
  })

  return {
    ...result,
    failures: result.failures.map((failure) => failure.reason),
  }
}
