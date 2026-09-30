import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

// Idle delay before saving
const AUTOSAVE_DELAY = 800

/*
 * Batches changes and saves them after a period of inactivity. Requests are chained to keep
 * their order; on failure, the changes are queued again.
 */
export function useAutosave<Patch extends object>(save: (patch: Patch) => Promise<unknown>) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const pending = useRef<Partial<Patch>>({})
  const timer = useRef<number | null>(null)
  const chain = useRef<Promise<void>>(Promise.resolve())

  const flush = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    chain.current = chain.current.then(async () => {
      const patch = pending.current
      if (!Object.keys(patch).length) return
      pending.current = {}
      setStatus('saving')
      try {
        await save(patch as Patch)
        setStatus(Object.keys(pending.current).length ? 'pending' : 'saved')
      } catch {
        pending.current = { ...patch, ...pending.current }
        setStatus('error')
      }
    })
    return chain.current
  }, [save])

  const queue = useCallback(
    (patch: Partial<Patch>) => {
      pending.current = { ...pending.current, ...patch }
      setStatus('pending')
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, AUTOSAVE_DELAY)
    },
    [flush],
  )

  // Latest version of flush, to call it on unmount without re-running the effect
  const latestFlush = useRef(flush)
  useEffect(() => {
    latestFlush.current = flush
  }, [flush])

  useEffect(() => {
    // Tab reload or close: the browser warns if changes are still pending
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      // In-app navigation (the component unmounts): send whatever is still pending
      void latestFlush.current()
    }
  }, [])

  return { status, queue, flush }
}
