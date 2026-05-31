import type { Ref } from 'vue'
import { logger } from '../../shared/lib/logger'
import {
  runRefreshTasks,
  type RefreshTask,
  type RefreshTasksResult,
} from '../../shared/lib/refreshHelper'
import { notifyError } from '../../shared/ui/feedback'

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
      notifyError('common.networkErr')
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
