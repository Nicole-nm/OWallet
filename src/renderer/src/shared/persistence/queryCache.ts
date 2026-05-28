type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const DEFAULT_TTL_MS = 1000
const cache = new Map<string, CacheEntry<unknown>>()

function serialize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    )
    return `{${entries.map(([key, nestedValue]) => `${key}:${serialize(nestedValue)}`).join(',')}}`
  }

  return JSON.stringify(value)
}

export function invalidateQueryCache(prefix?: string) {
  if (!prefix) {
    cache.clear()
    return
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

export async function getCachedQueryResult<T>({
  prefix,
  query,
  loader,
  ttlMs = DEFAULT_TTL_MS,
}: {
  prefix: string
  query: unknown
  loader: () => Promise<T>
  ttlMs?: number
}) {
  const cacheKey = `${prefix}:${serialize(query)}`
  const cachedEntry = cache.get(cacheKey)
  const now = Date.now()

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.value as T
  }

  const value = await loader()
  cache.set(cacheKey, {
    value,
    expiresAt: now + ttlMs,
  })
  return value
}
