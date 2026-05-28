/**
 * Run an async mapper across `items` with bounded concurrency, never throwing.
 *
 * Mirrors `Promise.allSettled` semantics — each result is either
 * `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` — but
 * caps the number of in-flight promises at `concurrency` so that fan-out over
 * a large list doesn't overwhelm the network or remote service.
 *
 * Results preserve input order.
 */
export async function settledWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 6
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      try {
        results[index] = { status: 'fulfilled', value: await fn(items[index]!) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  const workers = Array.from({ length: workerCount }, () => worker())
  await Promise.all(workers)
  return results
}
