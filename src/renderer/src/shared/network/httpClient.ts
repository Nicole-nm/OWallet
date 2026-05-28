import { fetchJson } from '../platform/bridge'

type HttpMethod = 'GET' | 'POST' | 'get' | 'post'

interface HttpConfig {
  params?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  silent?: boolean
  url?: string
  method?: HttpMethod
  data?: unknown
  cacheTtlMs?: number
}

// ---------------------------------------------------------------------------
// Simple LRU cache for GET requests
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const MAX_CACHE_SIZE = 128
const responseCache = new Map<string, CacheEntry>()

function getCached(key: string): unknown | undefined {
  const entry = responseCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key)
    return undefined
  }
  return entry.data
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  // Evict oldest entries when at capacity
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value
    if (firstKey !== undefined) responseCache.delete(firstKey)
  }
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function clearHttpCache(): void {
  responseCache.clear()
}

// ---------------------------------------------------------------------------
// In-flight request deduplication for GET
// Two simultaneous httpClient.get(sameUrl) calls share a single round-trip.
// ---------------------------------------------------------------------------

const inFlightGets = new Map<string, Promise<unknown>>()

function dedupGet(key: string, exec: () => Promise<unknown>): Promise<unknown> {
  const existing = inFlightGets.get(key)
  if (existing) return existing
  const promise = exec().finally(() => {
    inFlightGets.delete(key)
  })
  inFlightGets.set(key, promise)
  return promise
}

// ---------------------------------------------------------------------------

function buildUrl(url: string, params: HttpConfig['params']): string {
  if (!params) return url

  const qs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

  if (!qs) return url

  return url + (url.includes('?') ? '&' : '?') + qs
}

async function request(
  method: string,
  url: string,
  data?: unknown,
  config: HttpConfig = {}
): Promise<unknown> {
  const fullUrl = buildUrl(url, config.params)
  const options: Record<string, unknown> = { method }
  if (data !== undefined && data !== null) {
    options.body = data
  }
  if (config.headers) {
    options.headers = config.headers
  }

  return fetchJson(fullUrl, options)
}

function httpClient(urlOrConfig: string | HttpConfig = {}): Promise<unknown> {
  if (typeof urlOrConfig === 'string') {
    return request('GET', urlOrConfig)
  }

  const config = urlOrConfig
  const method = (config.method || 'GET').toUpperCase()
  return request(method, config.url || '', config.data, config)
}

httpClient.get = <T = unknown>(url: string, config?: HttpConfig): Promise<T> => {
  const fullUrl = buildUrl(url, config?.params)
  const ttl = config?.cacheTtlMs
  if (ttl !== undefined && ttl > 0) {
    const cached = getCached(fullUrl)
    if (cached !== undefined) return Promise.resolve(cached as T)
    return dedupGet(fullUrl, () => request('GET', url, undefined, config)).then((data: unknown) => {
      setCache(fullUrl, data, ttl)
      return data as T
    })
  }
  return dedupGet(fullUrl, () => request('GET', url, undefined, config)) as Promise<T>
}
httpClient.post = <T = unknown>(url: string, data?: unknown, config?: HttpConfig): Promise<T> =>
  request('POST', url, data, config) as Promise<T>

export default httpClient
