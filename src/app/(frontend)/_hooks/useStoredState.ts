import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

/*
 * A small per-browser preference kept in localStorage (e.g. folded folders). Read as an
 * external store: client navigations render the stored value straight away, and other tabs'
 * changes come in. Storage can be unavailable (private mode): the preference then lasts for
 * the visit. On the server, and while hydrating, the initial value is used.
 */

// Same-tab writes; the "storage" event only reports other tabs'
const listeners = new Set<() => void>()
const memoryValues = new Map<string, string>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === null) memoryValues.clear()
    else memoryValues.delete(event.key)
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const read = (key: string) => {
  const memory = memoryValues.get(key)
  if (memory !== undefined) return memory
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/*
 * `isValue` checks what is read back: another version of the app, or the writer, may have
 * stored something else under the key
 */
export function useStoredState<Value>(
  key: string,
  initial: Value,
  isValue: (value: unknown) => value is Value,
) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  )
  // Only the first initial value counts: it stands in while nothing is stored
  const [fallback] = useState(initial)
  const value = useMemo((): Value => {
    if (raw === null) return fallback
    try {
      const stored: unknown = JSON.parse(raw)
      return isValue(stored) ? stored : fallback
    } catch {
      return fallback
    }
  }, [raw, fallback, isValue])

  const update = useCallback(
    (next: Value) => {
      const serialized = JSON.stringify(next)
      try {
        window.localStorage.setItem(key, serialized)
        memoryValues.delete(key)
      } catch {
        // Shared by every subscriber and kept when a component remounts during this visit
        memoryValues.set(key, serialized)
      }
      listeners.forEach((listener) => listener())
    },
    [key],
  )

  return [value, update] as const
}
