import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVersion: vi.fn(() => '0.11.0'),
  fetch: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    commandLine: { appendSwitch: vi.fn() },
    getPath: vi.fn(() => '/tmp/owallet-user-data'),
    getVersion: mocks.getVersion,
    setPath: vi.fn(),
  },
}))

type IpcHandler = (_event: unknown, payload: unknown) => unknown

async function getFetchJsonHandler() {
  vi.resetModules()
  const handlers: Record<string, IpcHandler> = {}
  const ipcMain = {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers[channel] = handler
    }),
  }

  const { registerNetworkIpc } = await import('./network')
  registerNetworkIpc(ipcMain as never)

  return handlers['http:fetchJson']
}

describe('network IPC service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mocks.fetch)
  })

  it('fetches allowed JSON endpoints with safe default headers', async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ tag_name: 'v0.11.0' }), { status: 200 })
    )
    const handler = await getFetchJsonHandler()

    const result = await handler?.(null, {
      url: 'https://api.github.com/repos/ontio/OWallet/releases/latest',
      options: {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer should-not-forward',
        },
      },
    })

    expect(result).toEqual({ tag_name: 'v0.11.0' })
    expect(mocks.fetch).toHaveBeenCalledTimes(1)

    const [requestUrl, requestInit] = mocks.fetch.mock.calls[0] as [URL, RequestInit]
    const headers = requestInit.headers as Headers
    expect(requestUrl.href).toBe('https://api.github.com/repos/ontio/OWallet/releases/latest')
    expect(requestInit.method).toBe('GET')
    expect(requestInit.redirect).toBe('error')
    expect(headers.get('Accept')).toBe('application/vnd.github+json')
    expect(headers.get('Authorization')).toBeNull()
    expect(headers.get('User-Agent')).toContain('OWallet/0.11.0')
  })

  it('serializes object bodies for allowed POST requests', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('', { status: 200 }))
    const handler = await getFetchJsonHandler()

    const result = await handler?.(null, {
      url: 'https://service.onto.app/S5/api/v1/ontpass/SharedWallet/create',
      options: {
        method: 'post',
        body: { address: 'AKeystoreAddress' },
      },
    })

    const [, requestInit] = mocks.fetch.mock.calls[0] as [URL, RequestInit]
    const headers = requestInit.headers as Headers
    expect(result).toEqual({})
    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toBe(JSON.stringify({ address: 'AKeystoreAddress' }))
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('rejects disallowed URLs and malformed input before fetching', async () => {
    const handler = await getFetchJsonHandler()

    await expect(
      handler?.(null, { url: 'https://api.github.com.attacker.test/repos', options: {} })
    ).rejects.toThrow('Blocked network request')
    expect(() => handler?.(null, { url: 'not a url', options: {} })).toThrow('malformed URL')
    expect(() => handler?.(null, { url: 'javascript:alert(1)', options: {} })).toThrow(
      'only supports http/https'
    )
    expect(() => handler?.(null, { url: 42, options: {} })).toThrow('requires a string URL')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('rejects unsupported HTTP methods before fetching', async () => {
    const handler = await getFetchJsonHandler()

    await expect(
      handler?.(null, {
        url: 'https://api.github.com/repos/ontio/OWallet/releases/latest',
        options: { method: 'DELETE' },
      })
    ).rejects.toThrow('Blocked unsupported HTTP method: DELETE')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('surfaces HTTP and JSON parsing failures with useful messages', async () => {
    const handler = await getFetchJsonHandler()

    mocks.fetch.mockResolvedValueOnce(new Response('server exploded', { status: 500 }))
    await expect(
      handler?.(null, {
        url: 'https://api.github.com/repos/ontio/OWallet/releases/latest',
        options: {},
      })
    ).rejects.toThrow('HTTP 500')

    mocks.fetch.mockResolvedValueOnce(new Response('not-json', { status: 200 }))
    await expect(
      handler?.(null, {
        url: 'https://api.github.com/repos/ontio/OWallet/releases/latest',
        options: {},
      })
    ).rejects.toThrow('Invalid JSON')
  })
})
