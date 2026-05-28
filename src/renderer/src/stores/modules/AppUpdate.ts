import { defineStore } from 'pinia'
import pkg from '../../../../../package.json'
import type { AppUpdateStatus } from '../../shared/types/appUpdate'

export const useAppUpdateStore = defineStore('AppUpdate', {
  state: () => ({
    currentVersion: pkg.version as string,
    latestVersion: null as string | null,
    releaseUrl: '',
    hasChecked: false,
    hasUpdate: false,
    isChecking: false,
    lastCheckedAt: null as number | null,
    errorKey: null as string | null,
  }),
  actions: {
    startChecking() {
      this.isChecking = true
      this.errorKey = null
    },
    finishChecking() {
      this.isChecking = false
    },
    setStatus(status: AppUpdateStatus) {
      this.currentVersion = status.currentVersion
      this.latestVersion = status.latestVersion
      this.releaseUrl = status.releaseUrl
      this.hasChecked = true
      this.hasUpdate = status.hasUpdate
      this.lastCheckedAt = status.checkedAt
      this.errorKey = status.errorKey
    },
  },
})
