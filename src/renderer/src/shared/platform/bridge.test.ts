import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as bridge from './bridge'

function makePlatform() {
  return {
    dialog: { openDirectory: vi.fn(async () => ({ canceled: false, path: '/p' })) },
    preferences: {
      getSavePath: vi.fn(async () => '/save'),
      hasConfiguredSavePath: vi.fn(async () => true),
      setSavePath: vi.fn(async () => {}),
    },
    keystoreDb: {
      find: vi.fn(async () => [{ id: 1 }]),
      insert: vi.fn(async (doc: unknown) => doc),
      update: vi.fn(async () => 1),
      remove: vi.fn(async () => 1),
    },
    http: { fetchJson: vi.fn(async () => ({ ok: true })) },
    shell: { openExternal: vi.fn(async () => {}) },
    system: {
      validateKeystorePath: vi.fn(async () => true),
      isTest: vi.fn(async () => true),
    },
  }
}

let platform: ReturnType<typeof makePlatform>

beforeEach(() => {
  platform = makePlatform()
  ;(globalThis as { window?: unknown }).window = { owalletPlatform: platform }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('platform bridge', () => {
  it('delegates each call to the injected platform api', async () => {
    await bridge.openDirectory({ defaultPath: '/x' })
    await bridge.getSavePath()
    await bridge.hasConfiguredSavePath()
    await bridge.setSavePath('/new')
    await bridge.dbFind({ type: 'CommonWallet' })
    await bridge.dbInsert({ type: 'CommonWallet', address: 'a', wallet: {} })
    await bridge.dbUpdate({ address: 'a' }, { type: 'CommonWallet', address: 'a', wallet: {} })
    await bridge.fetchJson('https://api.test')
    await bridge.openExternal('https://ext.test')
    await bridge.validateKeystorePath('/k')
    await bridge.isTestEnvironment()

    expect(platform.dialog.openDirectory).toHaveBeenCalledWith({ defaultPath: '/x' })
    expect(platform.preferences.setSavePath).toHaveBeenCalledWith('/new')
    expect(platform.keystoreDb.find).toHaveBeenCalledWith({ type: 'CommonWallet' })
    expect(platform.http.fetchJson).toHaveBeenCalledWith('https://api.test', {})
    expect(platform.shell.openExternal).toHaveBeenCalledWith('https://ext.test')
  })

  it('rejects an empty dbRemove query before touching the platform', () => {
    expect(() => bridge.dbRemove({})).toThrow(/non-empty query/)
    expect(platform.keystoreDb.remove).not.toHaveBeenCalled()
  })

  it('forwards a non-empty dbRemove query', async () => {
    await bridge.dbRemove({ type: 'CommonWallet', address: 'a' })
    expect(platform.keystoreDb.remove).toHaveBeenCalledWith(
      { type: 'CommonWallet', address: 'a' },
      {}
    )
  })

  it('throws a descriptive error when the platform bridge is missing', () => {
    delete (globalThis as { window?: unknown }).window
    expect(() => bridge.getSavePath()).toThrow(/Platform bridge is not available/)
  })
})
