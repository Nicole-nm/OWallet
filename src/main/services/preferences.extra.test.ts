import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPath: vi.fn(() => '/tmp/owallet-user-data'),
  mkdir: vi.fn(async () => undefined),
  readFile: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(async () => undefined),
  validateKeystorePath: vi.fn(async () => true),
}))

vi.mock('electron', () => ({
  app: { getPath: mocks.getPath },
}))

vi.mock('node:fs/promises', () => ({
  mkdir: mocks.mkdir,
  readFile: mocks.readFile,
  stat: mocks.stat,
  writeFile: mocks.writeFile,
}))

vi.mock('./pathValidation', () => ({
  validateKeystorePath: mocks.validateKeystorePath,
}))

const savedEnv: Record<string, string | undefined> = {}
const envKeys = ['IS_TEST', 'OWALLET_TEST_DATA_DIR'] as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  for (const key of envKeys) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
})

describe('preferences test-data override', () => {
  it('prefers the test data directory when running tests', async () => {
    process.env.IS_TEST = '1'
    process.env.OWALLET_TEST_DATA_DIR = '/tmp/test-data'
    const { getConfiguredSavePath } = await import('./preferences')
    await expect(getConfiguredSavePath()).resolves.toBe('/tmp/test-data')
    expect(mocks.readFile).not.toHaveBeenCalled()
  })
})

describe('preferences normalization', () => {
  it('ignores non-object preference payloads', async () => {
    mocks.readFile.mockResolvedValueOnce(JSON.stringify(['not', 'an', 'object']))
    const { getConfiguredSavePath } = await import('./preferences')
    await expect(getConfiguredSavePath()).resolves.toBeNull()
  })

  it('ignores a missing savePath field', async () => {
    mocks.readFile.mockResolvedValueOnce(JSON.stringify({ other: true }))
    const { getConfiguredSavePath } = await import('./preferences')
    await expect(getConfiguredSavePath()).resolves.toBeNull()
  })
})

describe('preferences read errors', () => {
  it('rethrows non-ENOENT read failures', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'EACCES' }))
    const { getConfiguredSavePath } = await import('./preferences')
    await expect(getConfiguredSavePath()).rejects.toThrow('boom')
  })
})

describe('setConfiguredSavePath validation and notifications', () => {
  it('rejects an invalid save path', async () => {
    mocks.validateKeystorePath.mockResolvedValueOnce(false)
    const { setConfiguredSavePath } = await import('./preferences')
    await expect(setConfiguredSavePath('/bad')).rejects.toThrow('Invalid save path')
  })

  it('notifies the save-path listener when the path changes', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    const { onPreferencesSavePathChanged, setConfiguredSavePath } = await import('./preferences')
    const listener = vi.fn()
    onPreferencesSavePathChanged(listener)
    await setConfiguredSavePath('/tmp/new-path')
    expect(listener).toHaveBeenCalledWith(undefined)
  })
})

describe('clearConfiguredSavePath', () => {
  it('returns early when nothing is configured', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    const { clearConfiguredSavePath } = await import('./preferences')
    await expect(clearConfiguredSavePath()).resolves.toEqual({})
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it('removes a configured save path', async () => {
    mocks.readFile.mockResolvedValueOnce(JSON.stringify({ savePath: '/tmp/custom' }))
    const { clearConfiguredSavePath } = await import('./preferences')
    await expect(clearConfiguredSavePath()).resolves.toEqual({})
    expect(mocks.writeFile).toHaveBeenCalled()
  })
})

describe('hasConfiguredSavePath with default-path keystore', () => {
  it('returns true when the default path already has a keystore.db', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    mocks.stat.mockResolvedValueOnce({ isFile: () => true })
    const { hasConfiguredSavePath } = await import('./preferences')
    await expect(hasConfiguredSavePath()).resolves.toBe(true)
    expect(mocks.stat).toHaveBeenCalledWith('/tmp/owallet-user-data/keystore.db')
  })

  it('returns false when there is no savePath and no keystore.db', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    mocks.stat.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    const { hasConfiguredSavePath } = await import('./preferences')
    await expect(hasConfiguredSavePath()).resolves.toBe(false)
  })
})

describe('registerPreferencesIpc', () => {
  it('wires the preferences handlers and validates inputs', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const ipcMain = {
      handle: vi.fn((channel: string, fn: (...args: unknown[]) => unknown) => {
        handlers.set(channel, fn)
      }),
    }
    mocks.readFile.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    mocks.stat.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }))

    const { registerPreferencesIpc } = await import('./preferences')
    registerPreferencesIpc(ipcMain as never)

    expect(handlers.has('preferences:getSavePath')).toBe(true)
    await expect(handlers.get('preferences:getSavePath')!({})).resolves.toBe(
      '/tmp/owallet-user-data'
    )
    await expect(handlers.get('preferences:hasConfiguredSavePath')!({})).resolves.toBe(false)
    await expect(handlers.get('preferences:setSavePath')!({}, '')).rejects.toThrow(
      'non-empty string'
    )
    await expect(handlers.get('preferences:setSavePath')!({}, '/tmp/x')).resolves.toBe('/tmp/x')
  })
})
