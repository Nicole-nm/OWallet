import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  savePath: '',
  defaultPath: '',
  clearConfiguredSavePath: vi.fn(async () => {}),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => state.defaultPath),
  },
}))

vi.mock('../config', () => ({
  isDevelopment: false,
}))

vi.mock('./preferences', () => ({
  getResolvedSavePath: vi.fn(async () => state.savePath),
  clearConfiguredSavePath: state.clearConfiguredSavePath,
}))

type IpcHandler = (event: unknown, payload: unknown) => unknown

async function loadDatabaseIpc() {
  vi.resetModules()
  const handlers: Record<string, IpcHandler> = {}
  const ipcMain = {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers[channel] = handler
    }),
  }

  const databaseModule = await import('./database')
  databaseModule.registerDatabaseIpc(ipcMain as never)

  return { handlers, closeAllDatabases: databaseModule.closeAllDatabases }
}

const sampleWallet = {
  type: 'CommonWallet',
  address: 'AeAEW6dRJQ5gWQ7t1HwLG4nM4QwFwLfDdM',
  wallet: { name: 'primary', publicKey: '02abcabc' },
}

const tempDirs: string[] = []

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'owallet-db-'))
  tempDirs.push(dir)
  return dir
}

describe('keystore database cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.defaultPath = makeTempDir()
  })

  afterAll(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rebuilds the connection from disk after the cache is cleared', async () => {
    const dir = makeTempDir()
    state.savePath = dir

    const { handlers, closeAllDatabases } = await loadDatabaseIpc()

    await handlers['keystoreDb:insert']?.(null, { doc: sampleWallet })

    const before = (await handlers['keystoreDb:find']?.(null, {
      query: { type: 'CommonWallet' },
    })) as unknown[]
    expect(before).toHaveLength(1)

    // Simulate a save-path change clearing every cached connection.
    closeAllDatabases()

    // A fresh connection must reload the persisted record from disk.
    const after = (await handlers['keystoreDb:find']?.(null, {
      query: { type: 'CommonWallet' },
    })) as unknown[]
    expect(after).toHaveLength(1)
    expect((after[0] as { address: string }).address).toBe(sampleWallet.address)
  })

  it('isolates records per save path', async () => {
    const dirA = makeTempDir()
    const dirB = makeTempDir()

    state.savePath = dirA
    const { handlers } = await loadDatabaseIpc()
    await handlers['keystoreDb:insert']?.(null, { doc: sampleWallet })

    state.savePath = dirB
    const records = (await handlers['keystoreDb:find']?.(null, {
      query: { type: 'CommonWallet' },
    })) as unknown[]

    expect(records).toHaveLength(0)
  })
})
