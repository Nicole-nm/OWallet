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

const platformApi: OWalletPlatformApi = {
  dialog: {
    openDirectory(options: OpenDirectoryOptions = {}) {
      return ipcRenderer.invoke('dialog:openDirectory', options)
    },
  },
  preferences: {
    getSavePath() {
      return ipcRenderer.invoke('preferences:getSavePath')
    },
    hasConfiguredSavePath() {
      return ipcRenderer.invoke('preferences:hasConfiguredSavePath')
    },
    setSavePath(savePath: string) {
      return ipcRenderer.invoke('preferences:setSavePath', savePath)
    },
  },
  keystoreDb: {
    find<T = unknown>(query: KeystoreDbQuery = {}): Promise<T[]> {
      return ipcRenderer.invoke('keystoreDb:find', { query })
    },
    insert<T extends KeystoreDbDocument = KeystoreDbDocument>(doc: T): Promise<T> {
      return ipcRenderer.invoke('keystoreDb:insert', { doc })
    },
    update(
      query: KeystoreDbQuery,
      update: KeystoreDbDocument,
      options: KeystoreDbUpdateOptions = {}
    ): Promise<number> {
      return ipcRenderer.invoke('keystoreDb:update', { query, update, options })
    },
    remove(query: KeystoreDbQuery, options: KeystoreDbRemoveOptions = {}): Promise<number> {
      return ipcRenderer.invoke('keystoreDb:remove', { query, options })
    },
  },
  http: {
    fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
      return ipcRenderer.invoke('http:fetchJson', { url, options })
    },
  },
  shell: {
    openExternal(url: string) {
      return ipcRenderer.invoke('shell:openExternal', url)
    },
  },
  system: {
    validateKeystorePath(targetPath: string) {
      return ipcRenderer.invoke('system:validateKeystorePath', targetPath)
    },
    isTest() {
      return ipcRenderer.invoke('system:isTest')
    },
  },
}

if (!process.contextIsolated) {
  throw new Error('[OWallet] contextIsolation must be enabled')
}

contextBridge.exposeInMainWorld('owalletPlatform', Object.freeze(platformApi))
