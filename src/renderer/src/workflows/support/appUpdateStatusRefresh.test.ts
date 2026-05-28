import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUpdateStatus } from '../../shared/types/appUpdate'

const mocks = vi.hoisted(() => ({
  updateService: {
    loadLatestAvailableRelease: vi.fn(),
  },
}))

vi.mock('../../modules/app/application/updateApplicationService', () => ({
  loadLatestAvailableRelease: mocks.updateService.loadLatestAvailableRelease,
}))

import { useAppUpdateStore } from '../../stores/modules/AppUpdate'
import { refreshAppUpdateStatus } from './appUpdateStatusRefresh'

describe('appUpdateStatusRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('writes release check results into the shared app update store', async () => {
    const result: AppUpdateStatus = {
      ok: true,
      currentVersion: 'v0.11.0',
      latestVersion: 'v0.12.0',
      releaseUrl: 'https://example.com/release',
      hasUpdate: true,
      checkedAt: 1713052800000,
      errorKey: null,
    }
    mocks.updateService.loadLatestAvailableRelease.mockResolvedValue(result)

    await expect(refreshAppUpdateStatus()).resolves.toEqual(result)

    const appUpdateStore = useAppUpdateStore()
    expect(appUpdateStore.hasChecked).toBe(true)
    expect(appUpdateStore.hasUpdate).toBe(true)
    expect(appUpdateStore.latestVersion).toBe('v0.12.0')
    expect(appUpdateStore.releaseUrl).toBe('https://example.com/release')
    expect(appUpdateStore.isChecking).toBe(false)
  })

  it('reuses the pending update check while a request is still in flight', async () => {
    let resolveCheck: ((value: AppUpdateStatus) => void) | undefined
    const result: AppUpdateStatus = {
      ok: true,
      currentVersion: 'v0.11.0',
      latestVersion: 'v0.12.0',
      releaseUrl: 'https://example.com/release',
      hasUpdate: true,
      checkedAt: 1713052800000,
      errorKey: null,
    }
    const deferred = new Promise<AppUpdateStatus>((resolve) => {
      resolveCheck = resolve
    })
    mocks.updateService.loadLatestAvailableRelease.mockReturnValue(deferred)

    const firstCheck = refreshAppUpdateStatus()
    const secondCheck = refreshAppUpdateStatus()

    expect(mocks.updateService.loadLatestAvailableRelease).toHaveBeenCalledTimes(1)

    resolveCheck?.(result)

    await expect(firstCheck).resolves.toEqual(result)
    await expect(secondCheck).resolves.toEqual(result)
  })
})
