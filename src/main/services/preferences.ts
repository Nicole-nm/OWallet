'use strict'

import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { validateKeystorePath } from './pathValidation'

const PREFERENCES_FILENAME = 'owallet-preferences.json'

interface Preferences {
  savePath?: string
}

let preferencesCache: Preferences | null = null
let onSavePathChanged: ((oldPath: string | undefined) => void) | null = null

function getTestSavePathOverride() {
  if (process.env.IS_TEST && process.env.OWALLET_TEST_DATA_DIR) {
    return process.env.OWALLET_TEST_DATA_DIR
  }

  return null
}

/**
 * Register a callback invoked after the save path changes (e.g. to clear the DB cache).
 */
export function onPreferencesSavePathChanged(cb: (oldPath: string | undefined) => void): void {
  onSavePathChanged = cb
}

function getPreferencesPath() {
  return join(app.getPath('userData'), PREFERENCES_FILENAME)
}

function normalizePreferences(rawPreferences: unknown): Preferences {
  if (!rawPreferences || typeof rawPreferences !== 'object' || Array.isArray(rawPreferences)) {
    return {}
  }

  return typeof (rawPreferences as Preferences).savePath === 'string' &&
    (rawPreferences as Preferences).savePath
    ? { savePath: (rawPreferences as Preferences).savePath }
    : {}
}

async function readPreferences() {
  if (preferencesCache) {
    return preferencesCache
  }

  try {
    const content = await readFile(getPreferencesPath(), 'utf8')
    preferencesCache = normalizePreferences(JSON.parse(content))
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw error
    }
    preferencesCache = {}
  }

  return preferencesCache
}

async function writePreferences(preferences: Preferences): Promise<Preferences> {
  const filePath = getPreferencesPath()
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(preferences, null, 2))
  preferencesCache = preferences
  return preferencesCache
}

export async function getConfiguredSavePath() {
  const testSavePath = getTestSavePathOverride()
  if (testSavePath) {
    return testSavePath
  }

  const preferences = await readPreferences()
  return preferences.savePath || null
}

export async function hasConfiguredSavePath() {
  return Boolean(await getConfiguredSavePath())
}

export async function getResolvedSavePath() {
  return (await getConfiguredSavePath()) || app.getPath('userData')
}

export async function setConfiguredSavePath(savePath: string): Promise<Preferences> {
  if (!(await validateKeystorePath(savePath))) {
    throw new Error('[OWallet] Invalid save path')
  }

  const preferences = await readPreferences()
  const oldPath = preferences.savePath
  const result = await writePreferences({
    ...preferences,
    savePath,
  })

  if (oldPath !== savePath && onSavePathChanged) {
    onSavePathChanged(oldPath)
  }

  return result
}

export async function clearConfiguredSavePath() {
  const preferences = await readPreferences()
  if (!preferences.savePath) {
    return preferences
  }

  const nextPreferences = { ...preferences }
  delete nextPreferences.savePath
  return writePreferences(nextPreferences)
}

export function registerPreferencesIpc(ipcMain: IpcMain): void {
  ipcMain.handle('preferences:getSavePath', () => getResolvedSavePath())

  ipcMain.handle('preferences:hasConfiguredSavePath', () => hasConfiguredSavePath())

  ipcMain.handle('preferences:setSavePath', (_event: IpcMainInvokeEvent, savePath: unknown) => {
    if (typeof savePath !== 'string' || !savePath) {
      throw new Error('[OWallet] preferences:setSavePath requires a non-empty string path')
    }

    return setConfiguredSavePath(savePath).then((preferences) => preferences.savePath)
  })
}
