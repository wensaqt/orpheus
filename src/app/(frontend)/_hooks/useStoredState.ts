import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

/*
 * A small per-browser preference kept in localStorage (e.g. folded folders). Read as an
 * external store: client navigations render the stored value straight away, and other tabs'
 * changes come in. Storage can be unavailable (private mode): the preference then lasts for
 * the visit. On the server, and while hydrating, the initial value is used.
 */

// Same-tab writes; the "storage" event only reports other tabs'
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useStoredState<Value>(key: string, initial: Value) {
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
      return JSON.parse(raw) as Value
    } catch {
      return fallback
    }
  }, [raw, fallback])

  const update = useCallback(
    (next: Value) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Unavailable storage: nothing to remember
      }
      listeners.forEach((listener) => listener())
    },
    [key],
  )

  return [value, update] as const
}
