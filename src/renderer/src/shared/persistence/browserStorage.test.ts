import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getLocalItem,
  getLocalJson,
  getSessionItem,
  getSessionJson,
  getStorageItem,
  getStorageJson,
  removeLocalItems,
  removeSessionItems,
  removeStorageItems,
  setLocalItem,
  setLocalJson,
  setSessionItem,
  setSessionJson,
  setStorageItem,
} from './browserStorage'

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  get size() {
    return this.store.size
  }
}

let local: MemoryStorage
let session: MemoryStorage

beforeEach(() => {
  local = new MemoryStorage()
  session = new MemoryStorage()
  ;(globalThis as { window?: unknown }).window = {
    localStorage: local,
    sessionStorage: session,
  }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('getStorageItem', () => {
  it('returns the current value when present', () => {
    local.setItem('k', 'v')
    expect(getStorageItem('local', 'k')).toBe('v')
  })

  it('promotes a legacy value to the new key and removes legacy keys', () => {
    local.setItem('old', 'legacy')
    const result = getStorageItem('local', 'new', { legacyKeys: ['old'] })

    expect(result).toBe('legacy')
    expect(local.getItem('new')).toBe('legacy')
    expect(local.getItem('old')).toBeNull()
  })

  it('returns null when neither the key nor legacy keys exist', () => {
    expect(getStorageItem('local', 'missing', { legacyKeys: ['also-missing'] })).toBeNull()
  })

  it('returns null when no window is available', () => {
    delete (globalThis as { window?: unknown }).window
    expect(getStorageItem('local', 'k')).toBeNull()
  })
})

describe('setStorageItem / removeStorageItems', () => {
  it('stringifies values when writing', () => {
    setStorageItem('local', 'num', 5)
    expect(local.getItem('num')).toBe('5')
  })

  it('returns the value untouched when storage is unavailable', () => {
    delete (globalThis as { window?: unknown }).window
    expect(setStorageItem('local', 'num', 5)).toBe(5)
  })

  it('removes a single key or an array of keys', () => {
    local.setItem('a', '1')
    local.setItem('b', '2')
    removeStorageItems('local', 'a')
    removeStorageItems('local', ['b'])
    expect(local.getItem('a')).toBeNull()
    expect(local.getItem('b')).toBeNull()
  })
})

describe('json helpers', () => {
  it('round-trips JSON for local storage', () => {
    setLocalJson('obj', { a: 1 })
    expect(getLocalJson('obj')).toEqual({ a: 1 })
  })

  it('returns null for malformed JSON', () => {
    local.setItem('bad', '{not json')
    expect(getStorageJson('local', 'bad')).toBeNull()
  })

  it('returns null for an absent JSON key', () => {
    expect(getStorageJson('local', 'absent')).toBeNull()
  })
})

describe('local / session convenience wrappers', () => {
  it('reads and writes via the local wrappers', () => {
    setLocalItem('lk', 'lv')
    expect(getLocalItem('lk')).toBe('lv')
    removeLocalItems(['lk'])
    expect(getLocalItem('lk')).toBeNull()
  })

  it('reads and writes via the session wrappers', () => {
    setSessionItem('sk', 'sv')
    expect(getSessionItem('sk')).toBe('sv')
    setSessionJson('sj', [1, 2])
    expect(getSessionJson('sj')).toEqual([1, 2])
    removeSessionItems('sk')
    expect(getSessionItem('sk')).toBeNull()
  })
})
