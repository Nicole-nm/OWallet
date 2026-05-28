type StorageType = 'local' | 'session'

interface StorageOptions {
  legacyKeys?: string[]
}

type StorageKeys = string | string[]

function resolveStorage(storageType: StorageType): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (storageType === 'session') {
    return window.sessionStorage || null
  }

  return window.localStorage || null
}

function normalizeLegacyKeys(legacyKeys: string[] = []): string[] {
  return Array.isArray(legacyKeys) ? legacyKeys : []
}

function promoteLegacyValue(
  storage: Storage,
  key: string,
  legacyKeys: string[],
  value: string | null
): string | null {
  if (!storage || value === null || value === undefined) {
    return value
  }

  storage.setItem(key, value)
  for (const legacyKey of legacyKeys) {
    storage.removeItem(legacyKey)
  }
  return value
}

export function getStorageItem(
  storageType: StorageType,
  key: string,
  { legacyKeys = [] }: StorageOptions = {}
): string | null {
  const storage = resolveStorage(storageType)
  if (!storage) {
    return null
  }

  const currentValue = storage.getItem(key)
  if (currentValue !== null) {
    return currentValue
  }

  const normalizedLegacyKeys = normalizeLegacyKeys(legacyKeys)
  for (const legacyKey of normalizedLegacyKeys) {
    const legacyValue = storage.getItem(legacyKey)
    if (legacyValue !== null) {
      return promoteLegacyValue(storage, key, normalizedLegacyKeys, legacyValue)
    }
  }

  return null
}

export function setStorageItem(storageType: StorageType, key: string, value: unknown): unknown {
  const storage = resolveStorage(storageType)
  if (!storage) {
    return value
  }

  storage.setItem(key, String(value))
  return value
}

export function removeStorageItems(storageType: StorageType, keys: StorageKeys = []): void {
  const storage = resolveStorage(storageType)
  if (!storage) {
    return
  }

  const items = Array.isArray(keys) ? keys : [keys]
  for (const key of items) {
    storage.removeItem(key)
  }
}

export function getStorageJson<T = unknown>(
  storageType: StorageType,
  key: string,
  { legacyKeys = [] }: StorageOptions = {}
): T | null {
  const rawValue = getStorageItem(storageType, key, { legacyKeys })
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return null
  }
}

export function setStorageJson(storageType: StorageType, key: string, value: unknown): unknown {
  return setStorageItem(storageType, key, JSON.stringify(value))
}

export function getLocalItem(key: string, options?: StorageOptions): string | null {
  return getStorageItem('local', key, options)
}

export function setLocalItem(key: string, value: unknown): unknown {
  return setStorageItem('local', key, value)
}

export function removeLocalItems(keys: StorageKeys): void {
  return removeStorageItems('local', keys)
}

export function getLocalJson<T = unknown>(key: string, options?: StorageOptions): T | null {
  return getStorageJson('local', key, options)
}

export function setLocalJson(key: string, value: unknown): unknown {
  return setStorageJson('local', key, value)
}

export function getSessionItem(key: string, options?: StorageOptions): string | null {
  return getStorageItem('session', key, options)
}

export function setSessionItem(key: string, value: unknown): unknown {
  return setStorageItem('session', key, value)
}

export function removeSessionItems(keys: StorageKeys): void {
  return removeStorageItems('session', keys)
}

export function getSessionJson<T = unknown>(key: string, options?: StorageOptions): T | null {
  return getStorageJson('session', key, options)
}

export function setSessionJson(key: string, value: unknown): unknown {
  return setStorageJson('session', key, value)
}
