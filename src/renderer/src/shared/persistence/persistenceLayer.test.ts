import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getCurrentWalletSession,
  getSharedWalletSession,
  getWalletsTabSession,
  setCurrentWalletSession,
  setSharedWalletSession,
  setWalletsTabSession,
} from './sessionPersistence'
import {
  getDefaultNodeAddress,
  getNetwork,
  getNodeAddress,
  getThemeMode,
  setNetwork,
  setNodeAddress,
  setThemeMode,
} from './settingsPersistence'

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
}

beforeEach(() => {
  ;(globalThis as { window?: unknown }).window = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
  }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('sessionPersistence', () => {
  it('round-trips the current wallet session as JSON', () => {
    expect(getCurrentWalletSession()).toBeNull()
    setCurrentWalletSession({ address: 'A' })
    expect(getCurrentWalletSession()).toEqual({ address: 'A' })
  })

  it('round-trips the shared wallet session as JSON', () => {
    setSharedWalletSession({ address: 'S' })
    expect(getSharedWalletSession()).toEqual({ address: 'S' })
  })

  it('defaults the wallets tab to "1" and round-trips a stored value', () => {
    expect(getWalletsTabSession()).toBe('1')
    setWalletsTabSession('2')
    expect(getWalletsTabSession()).toBe('2')
  })
})

describe('settingsPersistence', () => {
  it('defaults the network and round-trips a stored value', () => {
    const initial = getNetwork()
    expect(typeof initial).toBe('string')
    setNetwork('TEST_NET')
    expect(getNetwork()).toBe('TEST_NET')
  })

  it('returns a default node address that matches the network default', () => {
    expect(getDefaultNodeAddress()).toBe(getNodeAddress())
  })

  it('falls back to the default node address for an empty or invalid value', () => {
    setNodeAddress('')
    expect(getNodeAddress()).toBe(getDefaultNodeAddress())
    setNodeAddress('::::not a url::::')
    expect(getNodeAddress()).toBe(getDefaultNodeAddress())
  })

  it('keeps a node address that belongs to the network node list', () => {
    const known = getDefaultNodeAddress()
    setNodeAddress(known)
    expect(getNodeAddress()).toBe(known)
  })

  it('normalizes the theme mode on read and write', () => {
    setThemeMode('not-a-mode')
    const normalized = getThemeMode()
    expect(['light', 'dark', 'system', 'auto']).toContain(normalized)
  })
})
