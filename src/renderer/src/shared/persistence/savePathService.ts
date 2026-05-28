import {
  getSavePath as platformGetSavePath,
  hasConfiguredSavePath as platformHasConfiguredSavePath,
  openDirectory,
  setSavePath as platformSetSavePath,
  validateKeystorePath,
} from '../platform/bridge'
import { getLocalItem, removeLocalItems } from './browserStorage'
import { LEGACY_LOCAL_STORAGE_KEYS } from './storageKeys'

function getLegacySavePath() {
  const legacySavePathKey = LEGACY_LOCAL_STORAGE_KEYS.savePath[0]
  if (!legacySavePathKey) return ''

  return (
    getLocalItem(legacySavePathKey, {
      legacyKeys: [],
    }) || ''
  )
}

function clearLegacySavePath() {
  removeLocalItems([
    ...LEGACY_LOCAL_STORAGE_KEYS.savePath,
    ...LEGACY_LOCAL_STORAGE_KEYS.savePathConfigured,
  ])
}

export function loadConfiguredSavePath() {
  return platformGetSavePath()
}

export function hasConfiguredSavePathSetting() {
  return platformHasConfiguredSavePath()
}

export async function migrateLegacySavePathPreference() {
  if (await platformHasConfiguredSavePath()) {
    clearLegacySavePath()
    return
  }

  const legacySavePath = getLegacySavePath()
  if (!legacySavePath) {
    return
  }

  if (await validateKeystorePath(legacySavePath)) {
    await platformSetSavePath(legacySavePath)
  }

  clearLegacySavePath()
}

export async function selectAndPersistSavePath() {
  const { filePaths } = await openDirectory()
  const selectedPath = filePaths?.[0]

  if (!selectedPath) {
    return { ok: false, errorKey: 'setting.notSetPath' }
  }

  if (!(await validateKeystorePath(selectedPath))) {
    return { ok: false, errorKey: 'setting.notInstallationPath' }
  }

  await platformSetSavePath(selectedPath)
  clearLegacySavePath()
  return { ok: true, path: selectedPath }
}
