import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appendSwitch: vi.fn(),
  getPath: vi.fn(() => '/tmp/owallet-user-data'),
  isPackaged: false,
  setPath: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    commandLine: { appendSwitch: mocks.appendSwitch },
    getPath: mocks.getPath,
    get isPackaged() {
      return mocks.isPackaged
    },
    setPath: mocks.setPath,
  },
}))

async function importConfig({ isPackaged = false } = {}) {
  mocks.isPackaged = isPackaged
  vi.resetModules()
  return import('./config')
}

const envKeys = ['IS_TEST', 'OWALLET_INSTALL_VUE_DEVTOOLS', 'OWALLET_OPEN_DEVTOOLS'] as const
const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isPackaged = false
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

describe('isAllowedApiUrl secure node port enforcement', () => {
  it('accepts a secure node on https with the required port', async () => {
    const { isAllowedApiUrl } = await importConfig()
    expect(isAllowedApiUrl('https://polaris1.ont.io:10334/')).toBe(true)
  })

  it('rejects a secure node on the wrong port', async () => {
    const { isAllowedApiUrl } = await importConfig()
    expect(isAllowedApiUrl('https://polaris1.ont.io:443/')).toBe(false)
  })
})

describe('shouldInstallVueDevtools', () => {
  it('is disabled in packaged builds', async () => {
    const { shouldInstallVueDevtools } = await importConfig({ isPackaged: true })
    expect(shouldInstallVueDevtools()).toBe(false)
  })

  it('is disabled while running tests', async () => {
    process.env.IS_TEST = '1'
    const { shouldInstallVueDevtools } = await importConfig()
    expect(shouldInstallVueDevtools()).toBe(false)
  })

  it('is enabled when explicitly opted in', async () => {
    process.env.OWALLET_INSTALL_VUE_DEVTOOLS = '1'
    const { shouldInstallVueDevtools } = await importConfig()
    expect(shouldInstallVueDevtools()).toBe(true)
  })

  it('falls back to the electron version heuristic', async () => {
    const { shouldInstallVueDevtools, electronMajorVersion } = await importConfig()
    expect(shouldInstallVueDevtools()).toBe(electronMajorVersion < 34)
  })
})

describe('shouldOpenDevtools', () => {
  it('only opens devtools in development when explicitly requested', async () => {
    process.env.OWALLET_OPEN_DEVTOOLS = '1'
    const { shouldOpenDevtools } = await importConfig()
    expect(shouldOpenDevtools()).toBe(true)
  })

  it('stays closed without the opt-in flag', async () => {
    const { shouldOpenDevtools } = await importConfig()
    expect(shouldOpenDevtools()).toBe(false)
  })
})

describe('configureAppEnvironment', () => {
  it('disables extensions and relocates session data in development', async () => {
    const { configureAppEnvironment } = await importConfig()
    configureAppEnvironment()
    expect(mocks.appendSwitch).toHaveBeenCalledWith('disable-extensions')
    expect(mocks.setPath).toHaveBeenCalledWith(
      'sessionData',
      expect.stringContaining('session-data-dev')
    )
  })

  it('keeps extensions enabled when devtools are requested', async () => {
    process.env.OWALLET_INSTALL_VUE_DEVTOOLS = '1'
    const { configureAppEnvironment } = await importConfig()
    configureAppEnvironment()
    expect(mocks.appendSwitch).not.toHaveBeenCalledWith('disable-extensions')
  })

  it('does not relocate session data in packaged builds', async () => {
    const { configureAppEnvironment } = await importConfig({ isPackaged: true })
    configureAppEnvironment()
    expect(mocks.setPath).not.toHaveBeenCalled()
  })
})
