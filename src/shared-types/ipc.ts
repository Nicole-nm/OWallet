/**
 * Shared IPC type definitions for the OWallet platform bridge.
 * Used across main process, preload, and renderer.
 */

export interface FetchJsonOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | Record<string, unknown>
}

export interface KeystoreDbUpdateOptions {
  multi?: boolean
  upsert?: boolean
}

export interface KeystoreDbRemoveOptions {
  multi?: boolean
}

export interface OpenDirectoryOptions {
  title?: string
  defaultPath?: string
}

export interface OpenDirectoryResult {
  canceled: boolean
  filePaths: string[]
}

export type KeystoreDbQuery = Record<string, unknown>
export type KeystoreDbDocument = Record<string, unknown>

export interface OWalletPlatformApi {
  dialog: {
    openDirectory(options?: OpenDirectoryOptions): Promise<OpenDirectoryResult>
  }
  preferences: {
    getSavePath(): Promise<string | null>
    hasConfiguredSavePath(): Promise<boolean>
    setSavePath(savePath: string): Promise<void>
  }
  keystoreDb: {
    find<T = unknown>(query: KeystoreDbQuery): Promise<T[]>
    insert<T extends KeystoreDbDocument = KeystoreDbDocument>(doc: T): Promise<T>
    update(
      query: KeystoreDbQuery,
      update: KeystoreDbDocument,
      options?: KeystoreDbUpdateOptions
    ): Promise<number>
    remove(query: KeystoreDbQuery, options?: KeystoreDbRemoveOptions): Promise<number>
  }
  http: {
    fetchJson<T = unknown>(url: string, options?: FetchJsonOptions): Promise<T>
  }
  shell: {
    openExternal(url: string): Promise<void>
  }
  system: {
    validateKeystorePath(targetPath: string): Promise<boolean>
    isTest(): Promise<boolean>
  }
}

declare global {
  interface Window {
    owalletPlatform: OWalletPlatformApi
  }
}

export {}
