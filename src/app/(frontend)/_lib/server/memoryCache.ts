import 'server-only'

type Entry<T> = { value: T; expiresAt: number }

type MemoryCacheOptions<T> = {
  maxEntries: number
  // Lifetime of a value, which may depend on the value (an empty result expires sooner)
  ttl: (value: T) => number
}

/*
 * In-process memory cache; nothing is written to disk or the database, so it is lost on
 * restart. The oldest entries are evicted beyond maxEntries, and two concurrent requests for
 * the same key share the same load.
 */
export function createMemoryCache<T>({ maxEntries, ttl }: MemoryCacheOptions<T>) {
  const entries = new Map<string, Entry<T>>()
  const inFlight = new Map<string, Promise<T>>()

  return async function cached(key: string, load: () => Promise<T>): Promise<T> {
    const entry = entries.get(key)
    if (entry && entry.expiresAt > Date.now()) {
      // Reinsert: the Map keeps usage order, so the oldest is evicted first
      entries.delete(key)
      entries.set(key, entry)
      return entry.value
    }

    const pending = inFlight.get(key)
    if (pending) return pending

    const loading = load()
      .then((value) => {
        entries.delete(key)
        entries.set(key, { value, expiresAt: Date.now() + ttl(value) })
        if (entries.size > maxEntries) entries.delete(entries.keys().next().value!)
        return value
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, loading)
    return loading
  }
}
