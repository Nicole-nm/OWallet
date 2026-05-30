import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCachedQueryResult, invalidateQueryCache } from './queryCache'

afterEach(() => {
  invalidateQueryCache()
  vi.useRealTimers()
})

describe('getCachedQueryResult', () => {
  it('returns the loader result and caches it for identical queries', async () => {
    const loader = vi.fn(async () => 'value')

    const first = await getCachedQueryResult({ prefix: 'p', query: { a: 1 }, loader })
    const second = await getCachedQueryResult({ prefix: 'p', query: { a: 1 }, loader })

    expect(first).toBe('value')
    expect(second).toBe('value')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('treats key order as irrelevant when serializing the query', async () => {
    const loader = vi.fn(async () => 'value')

    await getCachedQueryResult({ prefix: 'p', query: { a: 1, b: 2 }, loader })
    await getCachedQueryResult({ prefix: 'p', query: { b: 2, a: 1 }, loader })

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('serializes nested arrays, objects and nullish values into distinct keys', async () => {
    const loader = vi.fn(async (label: string) => label)

    await getCachedQueryResult({
      prefix: 'p',
      query: { list: [1, { x: null }], flag: undefined },
      loader: () => loader('a'),
    })
    await getCachedQueryResult({
      prefix: 'p',
      query: { list: [1, { x: 1 }], flag: undefined },
      loader: () => loader('b'),
    })

    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('reloads once the entry has expired', async () => {
    vi.useFakeTimers()
    const loader = vi.fn(async () => 'value')

    await getCachedQueryResult({ prefix: 'p', query: { a: 1 }, loader, ttlMs: 100 })
    vi.advanceTimersByTime(101)
    await getCachedQueryResult({ prefix: 'p', query: { a: 1 }, loader, ttlMs: 100 })

    expect(loader).toHaveBeenCalledTimes(2)
  })
})

describe('invalidateQueryCache', () => {
  it('drops only entries matching the prefix', async () => {
    const loaderA = vi.fn(async () => 'a')
    const loaderB = vi.fn(async () => 'b')

    await getCachedQueryResult({ prefix: 'alpha', query: {}, loader: loaderA })
    await getCachedQueryResult({ prefix: 'beta', query: {}, loader: loaderB })

    invalidateQueryCache('alpha')

    await getCachedQueryResult({ prefix: 'alpha', query: {}, loader: loaderA })
    await getCachedQueryResult({ prefix: 'beta', query: {}, loader: loaderB })

    expect(loaderA).toHaveBeenCalledTimes(2)
    expect(loaderB).toHaveBeenCalledTimes(1)
  })

  it('clears everything when no prefix is supplied', async () => {
    const loader = vi.fn(async () => 'a')
    await getCachedQueryResult({ prefix: 'alpha', query: {}, loader })

    invalidateQueryCache()

    await getCachedQueryResult({ prefix: 'alpha', query: {}, loader })
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
