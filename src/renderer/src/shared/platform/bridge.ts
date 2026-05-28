import type {
  KeystoreDbDocument,
  KeystoreDbQuery,
  KeystoreDbRemoveOptions,
  KeystoreDbUpdateOptions,
  FetchJsonOptions,
  OpenDirectoryOptions,
  OpenDirectoryResult,
  OWalletPlatformApi,
} from '../../../../shared-types/ipc'

function getPlatform(): OWalletPlatformApi {
  const platformRoot = typeof window !== 'undefined' ? window : undefined
  const platform = platformRoot?.owalletPlatform
  if (!platform) {
    throw new Error('[OWallet] Platform bridge is not available')
  }
  return platform
}

export function openDirectory(options: OpenDirectoryOptions = {}): Promise<OpenDirectoryResult> {
  return getPlatform().dialog.openDirectory(options)
}

export function getSavePath(): Promise<string | null> {
  return getPlatform().preferences.getSavePath()
}

export function hasConfiguredSavePath(): Promise<boolean> {
  return getPlatform().preferences.hasConfiguredSavePath()
}

export function setSavePath(savePath: string): Promise<void> {
  return getPlatform().preferences.setSavePath(savePath)
}

export function dbFind<T = unknown>(query: KeystoreDbQuery = {}): Promise<T[]> {
  return getPlatform().keystoreDb.find<T>(query)
}

export function dbInsert<T extends KeystoreDbDocument = KeystoreDbDocument>(doc: T): Promise<T> {
  return getPlatform().keystoreDb.insert<T>(doc)
}

export function dbUpdate(
  query: KeystoreDbQuery,
  update: KeystoreDbDocument,
  options: KeystoreDbUpdateOptions = {}
): Promise<number> {
  return getPlatform().keystoreDb.update(query, update, options)
}

export function dbRemove(
  query: KeystoreDbQuery,
  options: KeystoreDbRemoveOptions = {}
): Promise<number> {
  if (!query || Object.keys(query).length === 0) {
    throw new Error('[OWallet] dbRemove requires a non-empty query')
  }
  return getPlatform().keystoreDb.remove(query, options)
}

export function fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  return getPlatform().http.fetchJson<T>(url, options)
}

export function openExternal(url: string): Promise<void> {
  return getPlatform().shell.openExternal(url)
}

export function validateKeystorePath(path: string): Promise<boolean> {
  return getPlatform().system.validateKeystorePath(path)
}

export function isTestEnvironment(): Promise<boolean> {
  return getPlatform().system.isTest()
}

export default {
  openDirectory,
  getSavePath,
  hasConfiguredSavePath,
  setSavePath,
  dbFind,
  dbInsert,
  dbUpdate,
  dbRemove,
  fetchJson,
  openExternal,
  validateKeystorePath,
  isTestEnvironment,
}
