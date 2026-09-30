import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMemoryCache } from '@front/_lib/server/memoryCache'

describe('createMemoryCache', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('does not reload a value that is still valid', async () => {
    const cached = createMemoryCache<string>({ maxEntries: 10, ttl: () => 1000 })
    const load = vi.fn(async () => 'value')
    await cached('key', load)
    await cached('key', load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reloads after expiry, with a TTL that can depend on the value', async () => {
    const cached = createMemoryCache<string | null>({
      maxEntries: 10,
      ttl: (v) => (v ? 1000 : 100),
    })
    const empty = vi.fn(async () => null)
    await cached('empty', empty)
    vi.advanceTimersByTime(101)
    await cached('empty', empty)
    expect(empty).toHaveBeenCalledTimes(2)

    const full = vi.fn(async () => 'full')
    await cached('full', full)
    vi.advanceTimersByTime(101)
    await cached('full', full)
    expect(full).toHaveBeenCalledTimes(1)
  })

  it('evicts the least recently used entry beyond maxEntries', async () => {
    const cached = createMemoryCache<string>({ maxEntries: 2, ttl: () => 1000 })
    const load = vi.fn(async () => 'x')
    await cached('a', load)
    await cached('b', load)
    await cached('a', load) // "a" becomes the most recent again
    await cached('c', load) // evicts "b"
    load.mockClear()
    await cached('a', load)
    await cached('b', load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('shares an in-flight load between two requests', async () => {
    const cached = createMemoryCache<string>({ maxEntries: 10, ttl: () => 1000 })
    const load = vi.fn(async () => 'x')
    await Promise.all([cached('key', load), cached('key', load)])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failed load', async () => {
    const cached = createMemoryCache<string>({ maxEntries: 10, ttl: () => 1000 })
    await expect(cached('key', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await expect(cached('key', async () => 'ok')).resolves.toBe('ok')
  })
})
