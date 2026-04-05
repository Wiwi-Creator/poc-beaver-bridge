/**
 * Simple SWR-style data fetching with:
 * - In-memory cache with TTL
 * - Request deduplication (same in-flight request shared)
 * - Stale-while-revalidate (show stale data immediately, refresh in background)
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const DEFAULT_TTL = 30_000 // 30s

interface CacheEntry {
  data: unknown
  ts: number
  promise: Promise<unknown> | null
}

const cache = new Map<string, CacheEntry>()

export function invalidate(key: string) {
  cache.delete(key)
}

export function invalidatePrefix(prefix: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k)
  }
}

async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const now = Date.now()
  const entry = cache.get(key)

  // Serve from cache if fresh
  if (entry && !entry.promise && now - entry.ts < ttl) {
    return entry.data as T
  }

  // Deduplicate concurrent requests for the same key
  if (entry?.promise) {
    return entry.promise as Promise<T>
  }

  const promise = fetcher()
    .then(data => {
      cache.set(key, { data, ts: Date.now(), promise: null })
      return data
    })
    .catch(err => {
      // Remove so next call retries
      const current = cache.get(key)
      if (current?.promise === promise) cache.delete(key)
      throw err
    })

  cache.set(key, { data: entry?.data ?? null, ts: entry?.ts ?? 0, promise })
  return promise
}

interface UseDataResult<T> {
  data: T | null
  loading: boolean   // true only when no data at all (first load)
  refreshing: boolean // true when revalidating in background
  error: string | null
  refresh: () => void
}

export function useData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; enabled?: boolean } = {},
): UseDataResult<T> {
  const { ttl = DEFAULT_TTL, enabled = true } = options
  const [data, setData] = useState<T | null>(() => {
    // Serve stale data synchronously on first render
    const entry = cache.get(key)
    return entry?.data ? (entry.data as T) : null
  })
  const [loading, setLoading] = useState(!cache.has(key))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(
    (force = false) => {
      if (!enabled) return
      if (force) invalidate(key)

      const hasStale = cache.has(key) && (cache.get(key)?.data ?? null) !== null
      if (!hasStale) setLoading(true)
      else setRefreshing(true)

      cachedFetch(key, () => fetcherRef.current(), ttl)
        .then(result => {
          setData(result)
          setError(null)
        })
        .catch(e => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => { setLoading(false); setRefreshing(false) })
    },
    [key, ttl, enabled],
  )

  useEffect(() => { run() }, [run])

  return { data, loading, refreshing, error, refresh: () => run(true) }
}
