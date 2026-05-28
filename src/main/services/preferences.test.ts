import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPath: vi.fn(() => '/tmp/owallet-user-data'),
  mkdir: vi.fn(async () => undefined),
  readFile: vi.fn(),
  writeFile: vi.fn(async () => undefined),
  validateKeystorePath: vi.fn(async () => true),
}))

vi.mock('electron', () => ({
  app: {
    getPath: mocks.getPath,
  },
}))

vi.mock('node:fs/promises', () => ({
  mkdir: mocks.mkdir,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
}))

vi.mock('./pathValidation', () => ({
  validateKeystorePath: mocks.validateKeystorePath,
}))

describe('preferences service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('falls back to userData when no saved preference exists', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))

    const { getResolvedSavePath, hasConfiguredSavePath } = await import('./preferences')

    await expect(getResolvedSavePath()).resolves.toBe('/tmp/owallet-user-data')
    await expect(hasConfiguredSavePath()).resolves.toBe(false)
  })

  it('reads a configured save path from preferences', async () => {
    mocks.readFile.mockResolvedValueOnce(JSON.stringify({ savePath: '/tmp/custom-wallets' }))

    const { getConfiguredSavePath, getResolvedSavePath } = await import('./preferences')

    await expect(getConfiguredSavePath()).resolves.toBe('/tmp/custom-wallets')
    await expect(getResolvedSavePath()).resolves.toBe('/tmp/custom-wallets')
  })

  it('validates and persists a custom save path', async () => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))

    const { setConfiguredSavePath } = await import('./preferences')

    await setConfiguredSavePath('/tmp/custom-wallets')

    expect(mocks.validateKeystorePath).toHaveBeenCalledWith('/tmp/custom-wallets')
    expect(mocks.mkdir).toHaveBeenCalledWith('/tmp/owallet-user-data', { recursive: true })
    expect(mocks.writeFile).toHaveBeenCalledWith(
      '/tmp/owallet-user-data/owallet-preferences.json',
      JSON.stringify({ savePath: '/tmp/custom-wallets' }, null, 2)
    )
  })
})
