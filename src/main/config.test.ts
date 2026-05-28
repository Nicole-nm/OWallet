import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pathToFileURL } from 'node:url'
import { join } from 'path'

const mocks = vi.hoisted(() => ({
  appendSwitch: vi.fn(),
  getPath: vi.fn(() => '/tmp/owallet-user-data'),
  isPackaged: false,
  setPath: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: mocks.appendSwitch,
    },
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

function rendererEntryUrl() {
  return pathToFileURL(join(__dirname, '../renderer/index.html')).href
}

describe('main config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isPackaged = false
  })

  it('allows expected navigation origins', async () => {
    const { isAllowedURL } = await importConfig()

    expect(isAllowedURL(rendererEntryUrl())).toBe(true)
    expect(isAllowedURL('http://127.0.0.1:5173')).toBe(true)
    expect(isAllowedURL('http://localhost.evil.test:5173')).toBe(false)
    expect(isAllowedURL('file:///tmp/other.html')).toBe(false)
    expect(isAllowedURL('https://example.com')).toBe(false)
  })

  it('rejects lookalike renderer entry files outside the bundled path', async () => {
    const { isAllowedURL } = await importConfig()

    expect(isAllowedURL(rendererEntryUrl())).toBe(true)
    expect(isAllowedURL('file:///tmp/out/renderer/index.html')).toBe(false)
    expect(isAllowedURL('file:///tmp/evil/renderer/index.html')).toBe(false)
  })

  it('uses packaged mode even when NODE_ENV is not production', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    delete process.env.NODE_ENV

    try {
      const { isAllowedURL, isDevelopment, configureAppEnvironment } = await importConfig({
        isPackaged: true,
      })

      expect(isDevelopment).toBe(false)
      expect(isAllowedURL(rendererEntryUrl())).toBe(true)
      expect(isAllowedURL('http://127.0.0.1:5173')).toBe(false)

      configureAppEnvironment()
      expect(mocks.setPath).not.toHaveBeenCalled()
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('allows only known API hosts and protocols', async () => {
    const { isAllowedApiUrl } = await importConfig()

    expect(isAllowedApiUrl('https://api.github.com/repos/ontio/OWallet/releases/latest')).toBe(true)
    expect(isAllowedApiUrl('https://service.onto.app/S5/api/v1/ontpass/SharedWallet/create')).toBe(
      true
    )
    expect(isAllowedApiUrl('https://coincap.io/front')).toBe(true)
    expect(isAllowedApiUrl('https://min-api.cryptocompare.com/data/all/coinlist')).toBe(true)
    expect(isAllowedApiUrl('https://dappnode1.ont.io:10334/api/v1/block/height')).toBe(true)
    expect(isAllowedApiUrl('https://polaris1.ont.io:10334/api/v1/block/height')).toBe(true)
    expect(isAllowedApiUrl('http://example.com/api/v1/block/height')).toBe(false)
    expect(isAllowedApiUrl('file:///tmp/example.json')).toBe(false)
  })

  it('rejects subdomain-impersonation of allowlisted hosts', async () => {
    const { isAllowedApiUrl } = await importConfig()
    expect(isAllowedApiUrl('https://api.github.com.attacker.com/x')).toBe(false)
    expect(isAllowedApiUrl('https://coincap.io.attacker.com/front')).toBe(false)
    expect(isAllowedApiUrl('https://min-api.cryptocompare.com.evil.com/data/all/coinlist')).toBe(
      false
    )
    expect(isAllowedApiUrl('https://service.onto.app.evil.com/x')).toBe(false)
  })

  it('rejects http for hosts that require https', async () => {
    const { isAllowedApiUrl } = await importConfig()
    expect(isAllowedApiUrl('http://api.github.com/foo')).toBe(false)
    expect(isAllowedApiUrl('http://service.onto.app/foo')).toBe(false)
    expect(isAllowedApiUrl('http://explorer.ont.io/foo')).toBe(false)
    expect(isAllowedApiUrl('http://dappnode1.ont.io:20334/api/v1/block/height')).toBe(false)
    expect(isAllowedApiUrl('http://polaris1.ont.io:20334/api/v1/block/height')).toBe(false)
  })

  it('rejects non-http(s) protocols', async () => {
    const { isAllowedApiUrl } = await importConfig()
    expect(isAllowedApiUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedApiUrl('ftp://api.github.com/x')).toBe(false)
  })

  it('rejects malformed URLs without throwing', async () => {
    const { isAllowedApiUrl } = await importConfig()
    expect(isAllowedApiUrl('not a url')).toBe(false)
    expect(isAllowedApiUrl('')).toBe(false)
  })

  it('allows only approved external browser targets', async () => {
    const { isAllowedExternalUrl } = await importConfig()

    expect(isAllowedExternalUrl('https://github.com/ontio/OWallet/releases')).toBe(true)
    expect(isAllowedExternalUrl('https://support.ledgerwallet.com/hc/en-us/articles/1')).toBe(true)
    expect(isAllowedExternalUrl('https://github.com.evil.test/ontio/OWallet')).toBe(false)
    expect(isAllowedExternalUrl('http://github.com/ontio/OWallet')).toBe(false)
  })
})
