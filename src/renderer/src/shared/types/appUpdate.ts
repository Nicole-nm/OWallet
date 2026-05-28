export interface AppUpdateStatus {
  ok: boolean
  currentVersion: string
  latestVersion: string | null
  releaseUrl: string
  hasUpdate: boolean
  checkedAt: number
  errorKey: string | null
}
