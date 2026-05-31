import { fetchJson } from '../platform/bridge'

type HttpMethod = 'GET' | 'POST' | 'get' | 'post'

export interface HttpConfig {
  params?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  silent?: boolean
  url?: string
  method?: HttpMethod
  data?: unknown
  cacheTtlMs?: number
  timeoutMs?: number
  retry?: number
  retryDelayMs?: number
  retryOn?: (error: unknown, attempt: number, method: string) => boolean
}

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_GET_RETRIES = 1
const DEFAULT_RETRY_DELAY_MS = 250

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

function stableStringify(value: unknown): string {
  if (value === undefined) return ''
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`
}

function buildRequestKey(
  method: string,
  fullUrl: string,
  data?: unknown,
  headers?: HttpConfig['headers']
): string {
  return [method.toUpperCase(), fullUrl, stableStringify(headers), stableStringify(data)].join('|')
}

function createTimeoutError(url: string, timeoutMs: number): Error {
  const error = new Error(`[OWallet] Request to ${url} timed out after ${timeoutMs}ms`)
  error.name = 'OWalletRequestTimeoutError'
  return error
}

function withTimeout<T>(operation: () => Promise<T>, url: string, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return operation()

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError(url, timeoutMs)), timeoutMs)
  })

  return Promise.race([operation(), timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryCount(method: string, config: HttpConfig): number {
  if (typeof config.retry === 'number') return Math.max(0, Math.floor(config.retry))
  return method.toUpperCase() === 'GET' ? DEFAULT_GET_RETRIES : 0
}

function shouldRetry(error: unknown, attempt: number, method: string, config: HttpConfig): boolean {
  if (config.retryOn) {
    return config.retryOn(error, attempt, method)
  }

  return method.toUpperCase() === 'GET'
}

async function withRetry<T>(
  method: string,
  config: HttpConfig,
  operation: () => Promise<T>
): Promise<T> {
  const retryCount = getRetryCount(method, config)

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= retryCount || !shouldRetry(error, attempt + 1, method, config)) {
        throw error
      }
      await wait(config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS)
    }
  }
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

  return withRetry(method, config, () =>
    withTimeout(() => fetchJson(fullUrl, options), fullUrl, config.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  )
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
  const requestKey = buildRequestKey('GET', fullUrl, undefined, config?.headers)
  const ttl = config?.cacheTtlMs
  if (ttl !== undefined && ttl > 0) {
    const cached = getCached(requestKey)
    if (cached !== undefined) return Promise.resolve(cached as T)
    return dedupGet(requestKey, () => request('GET', url, undefined, config)).then(
      (data: unknown) => {
        setCache(requestKey, data, ttl)
        return data as T
      }
    )
  }
  return dedupGet(requestKey, () => request('GET', url, undefined, config)) as Promise<T>
}
httpClient.post = <T = unknown>(url: string, data?: unknown, config?: HttpConfig): Promise<T> =>
  request('POST', url, data, config) as Promise<T>

export default httpClient
