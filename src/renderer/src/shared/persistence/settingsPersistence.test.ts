import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDefaultNodeAddress,
  getNodeAddress,
  getThemeMode,
  setNodeAddress,
  setThemeMode,
} from './settingsPersistence'

function createStorage(): Storage {
  const state = new Map<string, string>()

  return {
    get length() {
      return state.size
    },
    clear() {
      state.clear()
    },
    getItem(key: string) {
      return state.get(key) ?? null
    },
    key(index: number) {
      return Array.from(state.keys())[index] ?? null
    },
    removeItem(key: string) {
      state.delete(key)
    },
    setItem(key: string, value: string) {
      state.set(key, String(value))
    },
  }
}

describe('settingsPersistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults theme mode to system when no preference is stored', () => {
    expect(getThemeMode()).toBe('system')
  })

  it('defaults node addresses to the HTTPS node list for the selected network', () => {
    expect(getDefaultNodeAddress('MAIN_NET')).toBe('https://dappnode1.ont.io')
    expect(getDefaultNodeAddress('TEST_NET')).toBe('https://polaris1.ont.io')
  })

  it('normalizes legacy http node addresses to the HTTPS node base URL', () => {
    window.localStorage.setItem('owallet:settings:network', 'MAIN_NET')
    window.localStorage.setItem('owallet:settings:node-address', 'http://dappnode3.ont.io:20334')

    expect(getNodeAddress()).toBe('https://dappnode3.ont.io')
  })

  it('stores node addresses in canonical HTTPS form', () => {
    window.localStorage.setItem('owallet:settings:network', 'TEST_NET')

    setNodeAddress('http://polaris4.ont.io')

    expect(window.localStorage.getItem('owallet:settings:node-address')).toBe(
      'https://polaris4.ont.io'
    )
  })

  it('persists supported theme modes', () => {
    setThemeMode('dark')

    expect(getThemeMode()).toBe('dark')
    expect(window.localStorage.getItem('owallet:settings:theme-mode')).toBe('dark')
  })

  it('normalizes invalid theme modes back to system', () => {
    window.localStorage.setItem('owallet:settings:theme-mode', 'blue')

    expect(getThemeMode()).toBe('system')

    setThemeMode('blue')
    expect(window.localStorage.getItem('owallet:settings:theme-mode')).toBe('system')
  })
})
