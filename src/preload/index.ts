/**
 * Preload: thin context bridge.
 *
 * All business logic (DB, network, path validation) lives in the main process.
 * This file only forwards calls via ipcRenderer.invoke.
 */
import { contextBridge, ipcRenderer } from 'electron'
import type {
  KeystoreDbDocument,
  KeystoreDbQuery,
  KeystoreDbRemoveOptions,
  KeystoreDbUpdateOptions,
  FetchJsonOptions,
  OpenDirectoryOptions,
  OWalletPlatformApi,
} from '../shared-types/ipc'
import {
  DEFAULT_IPC_TIMEOUT_MS,
  FILE_DIALOG_IPC_TIMEOUT_MS,
  NETWORK_IPC_TIMEOUT_MS,
  withIpcTimeout,
} from '../shared-types/ipcTimeout'

function invokeWithTimeout<T = unknown>(
  channel: string,
  timeoutMs = DEFAULT_IPC_TIMEOUT_MS,
  ...args: unknown[]
): Promise<T> {
  return withIpcTimeout(
    channel,
    timeoutMs,
    () => ipcRenderer.invoke(channel, ...args) as Promise<T>
  )
}

const platformApi: OWalletPlatformApi = {
  dialog: {
    openDirectory(options: OpenDirectoryOptions = {}) {
      return invokeWithTimeout('dialog:openDirectory', FILE_DIALOG_IPC_TIMEOUT_MS, options)
    },
  },
  preferences: {
    getSavePath() {
      return invokeWithTimeout('preferences:getSavePath')
    },
    hasConfiguredSavePath() {
      return invokeWithTimeout('preferences:hasConfiguredSavePath')
    },
    setSavePath(savePath: string) {
      return invokeWithTimeout('preferences:setSavePath', DEFAULT_IPC_TIMEOUT_MS, savePath)
    },
  },
  keystoreDb: {
    find<T = unknown>(query: KeystoreDbQuery = {}): Promise<T[]> {
      return invokeWithTimeout('keystoreDb:find', DEFAULT_IPC_TIMEOUT_MS, { query })
    },
    insert<T extends KeystoreDbDocument = KeystoreDbDocument>(doc: T): Promise<T> {
      return invokeWithTimeout('keystoreDb:insert', DEFAULT_IPC_TIMEOUT_MS, { doc })
    },
    update(
      query: KeystoreDbQuery,
      update: KeystoreDbDocument,
      options: KeystoreDbUpdateOptions = {}
    ): Promise<number> {
      return invokeWithTimeout('keystoreDb:update', DEFAULT_IPC_TIMEOUT_MS, {
        query,
        update,
        options,
      })
    },
    remove(query: KeystoreDbQuery, options: KeystoreDbRemoveOptions = {}): Promise<number> {
      return invokeWithTimeout('keystoreDb:remove', DEFAULT_IPC_TIMEOUT_MS, { query, options })
    },
  },
  http: {
    fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
      return invokeWithTimeout('http:fetchJson', NETWORK_IPC_TIMEOUT_MS, { url, options })
    },
  },
  shell: {
    openExternal(url: string) {
      return invokeWithTimeout('shell:openExternal', DEFAULT_IPC_TIMEOUT_MS, url)
    },
  },
  system: {
    validateKeystorePath(targetPath: string) {
      return invokeWithTimeout(
        'system:validateKeystorePath',
        FILE_DIALOG_IPC_TIMEOUT_MS,
        targetPath
      )
    },
    isTest() {
      return invokeWithTimeout('system:isTest')
    },
  },
}

if (!process.contextIsolated) {
  throw new Error('[OWallet] contextIsolation must be enabled')
}

contextBridge.exposeInMainWorld('owalletPlatform', Object.freeze(platformApi))
