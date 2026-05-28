import { loadLatestAvailableRelease } from '../../modules/app/application/updateApplicationService'
import { useAppUpdateStore } from '../../stores/modules/AppUpdate'
import type { AppUpdateStatus } from '../../shared/types/appUpdate'

let pendingCheck: Promise<AppUpdateStatus> | null = null

export async function refreshAppUpdateStatus() {
  const appUpdateStore = useAppUpdateStore()

  if (pendingCheck) {
    return pendingCheck
  }

  appUpdateStore.startChecking()
  pendingCheck = loadLatestAvailableRelease(appUpdateStore.currentVersion)

  try {
    const result = await pendingCheck
    appUpdateStore.setStatus(result)
    return result
  } finally {
    appUpdateStore.finishChecking()
    pendingCheck = null
  }
}
