import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  platform: vi.fn(() => 'darwin' as string),
  cwd: vi.fn(() => '/Users/test/project'),
}))

vi.mock('node:fs/promises', () => ({
  readdir: mocks.readdir,
  stat: mocks.stat,
}))

vi.mock('node:os', () => ({
  default: { platform: mocks.platform },
  platform: mocks.platform,
}))

describe('validateKeystorePath', () => {
  const ORIGINAL_CWD = process.cwd

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.cwd = mocks.cwd
    mocks.stat.mockResolvedValue({ isDirectory: () => true })
  })

  afterEach(() => {
    process.cwd = ORIGINAL_CWD
  })

  it('returns false for empty or non-string targetPath', async () => {
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('')).toBe(false)
    // @ts-expect-error testing runtime guard against non-string input
    expect(await validateKeystorePath(undefined)).toBe(false)
  })

  it('accepts existing directories on non-Windows platforms', async () => {
    mocks.platform.mockReturnValue('darwin')
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('/any/path')).toBe(true)
    expect(mocks.readdir).not.toHaveBeenCalled()
  })

  it('rejects non-directories on non-Windows platforms', async () => {
    mocks.platform.mockReturnValue('darwin')
    mocks.stat.mockResolvedValue({ isDirectory: () => false })
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('/tmp/keystore.db')).toBe(false)
  })

  it('rejects the current working directory and subpaths on non-Windows platforms', async () => {
    mocks.platform.mockReturnValue('darwin')
    mocks.cwd.mockReturnValue('/Users/test/project')
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('/Users/test/project')).toBe(false)
    expect(await validateKeystorePath('/Users/test/project/nested')).toBe(false)
  })

  it('on Windows, rejects directories that look like the OWallet install root', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.readdir.mockResolvedValue(['resources', 'OWallet.exe', 'locales'])
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('C:\\Program Files\\OWallet')).toBe(false)
  })

  it('on Windows, rejects the current working directory and subpaths', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.readdir.mockResolvedValue([])
    mocks.cwd.mockReturnValue('C:\\app')
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('C:\\app')).toBe(false)
    expect(await validateKeystorePath('C:\\app\\nested')).toBe(false)
  })

  it('on Windows, accepts a normal user directory', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.readdir.mockResolvedValue(['my-keystores.json'])
    mocks.cwd.mockReturnValue('C:\\app')
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('C:\\Users\\Alice\\Documents')).toBe(true)
  })

  it('on Windows, returns false if readdir throws (path unreadable)', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.readdir.mockRejectedValue(new Error('ENOENT'))
    const { validateKeystorePath } = await import('./pathValidation')
    expect(await validateKeystorePath('C:\\does\\not\\exist')).toBe(false)
  })
})
