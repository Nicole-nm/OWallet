import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchJson = vi.hoisted(() => vi.fn())

vi.mock('../platform/bridge', () => ({
  fetchJson,
}))

import httpClient, { clearHttpCache } from './httpClient'

beforeEach(() => {
  fetchJson.mockReset()
  fetchJson.mockResolvedValue({ ok: true })
  clearHttpCache()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('httpClient default invocation', () => {
  it('performs a GET when called with a URL string', async () => {
    await httpClient('https://api.test/path')

    expect(fetchJson).toHaveBeenCalledWith('https://api.test/path', { method: 'GET' })
  })

  it('honors method, body and query params from a config object', async () => {
    await httpClient({
      url: 'https://api.test/path',
      method: 'post',
      data: { a: 1 },
      params: { q: 'x', skip: undefined },
      headers: { 'content-type': 'application/json' },
    })

    expect(fetchJson).toHaveBeenCalledWith('https://api.test/path?q=x', {
      method: 'POST',
      body: { a: 1 },
      headers: { 'content-type': 'application/json' },
    })
  })

  it('appends params with & when the url already has a query string', async () => {
    await httpClient.get('https://api.test/path?existing=1', { params: { q: 'x' } })

    expect(fetchJson).toHaveBeenCalledWith('https://api.test/path?existing=1&q=x', {
      method: 'GET',
    })
  })
})

describe('httpClient.get caching and dedup', () => {
  it('returns the cached value within the TTL window', async () => {
    await httpClient.get('https://api.test/cached', { cacheTtlMs: 1000 })
    await httpClient.get('https://api.test/cached', { cacheTtlMs: 1000 })

    expect(fetchJson).toHaveBeenCalledTimes(1)
  })

  it('refetches after the cache TTL expires', async () => {
    vi.useFakeTimers()
    await httpClient.get('https://api.test/cached', { cacheTtlMs: 100 })
    vi.advanceTimersByTime(101)
    await httpClient.get('https://api.test/cached', { cacheTtlMs: 100 })

    expect(fetchJson).toHaveBeenCalledTimes(2)
  })

  it('deduplicates concurrent in-flight GET requests', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    fetchJson.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    const a = httpClient.get('https://api.test/inflight')
    const b = httpClient.get('https://api.test/inflight')
    resolveFetch({ ok: true })

    await Promise.all([a, b])
    expect(fetchJson).toHaveBeenCalledTimes(1)
  })

  it('does not deduplicate GET requests with different headers', async () => {
    await httpClient.get('https://api.test/inflight', { headers: { Accept: 'application/json' } })
    await httpClient.get('https://api.test/inflight', { headers: { Accept: 'text/plain' } })

    expect(fetchJson).toHaveBeenCalledTimes(2)
  })

  it('retries a failed GET once by default', async () => {
    vi.useFakeTimers()
    fetchJson.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce({ ok: true })

    const pending = httpClient.get('https://api.test/retry', { retryDelayMs: 100 })
    await vi.advanceTimersByTimeAsync(100)

    await expect(pending).resolves.toEqual({ ok: true })
    expect(fetchJson).toHaveBeenCalledTimes(2)
  })

  it('surfaces the last GET failure after retries are exhausted', async () => {
    vi.useFakeTimers()
    fetchJson.mockRejectedValue(new Error('still down'))

    const pending = httpClient.get('https://api.test/retry', { retry: 2, retryDelayMs: 100 })
    const assertion = expect(pending).rejects.toThrow('still down')
    await vi.advanceTimersByTimeAsync(200)

    await assertion
    expect(fetchJson).toHaveBeenCalledTimes(3)
  })

  it('rejects a request that exceeds the configured timeout', async () => {
    vi.useFakeTimers()
    fetchJson.mockImplementationOnce(() => new Promise(() => undefined))

    const pending = httpClient.get('https://api.test/slow', { timeoutMs: 500, retry: 0 })
    const assertion = expect(pending).rejects.toThrow('timed out after 500ms')
    vi.advanceTimersByTime(500)

    await assertion
  })
})

describe('httpClient.post', () => {
  it('issues a POST with the supplied body', async () => {
    await httpClient.post('https://api.test/submit', { value: 1 })

    expect(fetchJson).toHaveBeenCalledWith('https://api.test/submit', {
      method: 'POST',
      body: { value: 1 },
    })
  })

  it('does not retry POST requests by default', async () => {
    fetchJson.mockRejectedValue(new Error('submit failed'))

    await expect(httpClient.post('https://api.test/submit', { value: 1 })).rejects.toThrow(
      'submit failed'
    )
    expect(fetchJson).toHaveBeenCalledTimes(1)
  })
})
