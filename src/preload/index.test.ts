import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OWalletPlatformApi } from '../shared-types/ipc'

const mocks = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: mocks.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: mocks.invoke,
  },
}))

function setContextIsolation(value: boolean) {
  ;(process as NodeJS.Process & { contextIsolated?: boolean }).contextIsolated = value
}

async function importPreload() {
  vi.resetModules()
  setContextIsolation(true)
  mocks.invoke.mockResolvedValue(undefined)
  await import('./index')
  return mocks.exposeInMainWorld.mock.calls.at(-1)?.[1] as OWalletPlatformApi
}

describe('preload platform bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes a frozen owalletPlatform bridge when context isolation is enabled', async () => {
    const api = await importPreload()

    expect(mocks.exposeInMainWorld).toHaveBeenCalledWith('owalletPlatform', api)
    expect(Object.isFrozen(api)).toBe(true)
  })

  it('forwards dialog, preferences, shell, system, and HTTP calls to IPC channels', async () => {
    const api = await importPreload()

    await api.dialog.openDirectory({ title: 'Choose', defaultPath: '/tmp' })
    await api.preferences.getSavePath()
    await api.preferences.hasConfiguredSavePath()
    await api.preferences.setSavePath('/tmp/wallets')
    await api.http.fetchJson('https://api.github.com/repos/ontio/OWallet/releases/latest', {
      method: 'GET',
    })
    await api.shell.openExternal('https://github.com/ontio/OWallet')
    await api.system.validateKeystorePath('/tmp/wallets')
    await api.system.isTest()

    expect(mocks.invoke).toHaveBeenCalledWith('dialog:openDirectory', {
      title: 'Choose',
      defaultPath: '/tmp',
    })
    expect(mocks.invoke).toHaveBeenCalledWith('preferences:getSavePath')
    expect(mocks.invoke).toHaveBeenCalledWith('preferences:hasConfiguredSavePath')
    expect(mocks.invoke).toHaveBeenCalledWith('preferences:setSavePath', '/tmp/wallets')
    expect(mocks.invoke).toHaveBeenCalledWith('http:fetchJson', {
      url: 'https://api.github.com/repos/ontio/OWallet/releases/latest',
      options: { method: 'GET' },
    })
    expect(mocks.invoke).toHaveBeenCalledWith(
      'shell:openExternal',
      'https://github.com/ontio/OWallet'
    )
    expect(mocks.invoke).toHaveBeenCalledWith('system:validateKeystorePath', '/tmp/wallets')
    expect(mocks.invoke).toHaveBeenCalledWith('system:isTest')
  })

  it('wraps keystore database calls with structured payloads', async () => {
    const api = await importPreload()
    const query = { address: 'AKeystoreAddress' }
    const doc = { type: 'CommonWallet', address: 'AKeystoreAddress', wallet: { label: 'Main' } }
    const update = { $set: { wallet: { label: 'Renamed' } } }

    await api.keystoreDb.find(query)
    await api.keystoreDb.insert(doc)
    await api.keystoreDb.update(query, update, { upsert: true })
    await api.keystoreDb.remove(query, { multi: false })

    expect(mocks.invoke).toHaveBeenCalledWith('keystoreDb:find', { query })
    expect(mocks.invoke).toHaveBeenCalledWith('keystoreDb:insert', { doc })
    expect(mocks.invoke).toHaveBeenCalledWith('keystoreDb:update', {
      query,
      update,
      options: { upsert: true },
    })
    expect(mocks.invoke).toHaveBeenCalledWith('keystoreDb:remove', {
      query,
      options: { multi: false },
    })
  })

  it('throws during preload initialization when context isolation is disabled', async () => {
    vi.resetModules()
    setContextIsolation(false)

    await expect(import('./index')).rejects.toThrow('contextIsolation must be enabled')
    expect(mocks.exposeInMainWorld).not.toHaveBeenCalled()
  })
})
