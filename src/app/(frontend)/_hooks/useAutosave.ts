import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'

import { type ActionResult, succeeded } from '@front/_lib/actionResult'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

// Idle delay before saving
const AUTOSAVE_DELAY = 800
// After a failure, tries again on its own, less and less often (the last delay repeats)
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000]

/*
 * Saves after a pause in the changes. queue() records that something changed; save() reads the
 * latest state itself when it runs. flush() saves now and tells whether it worked. Saves are
 * chained to keep their order; a failed one is retried, sooner if the writer keeps typing.
 */
export function useAutosave(save: () => Promise<ActionResult<unknown>>) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  // Changes not sent yet, and a save on its way
  const dirty = useRef(false)
  const sending = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const chain = useRef(Promise.resolve(true))
  const failures = useRef(0)
  // A retry must not outlive the component (e.g. a deleted document's editor)
  const mounted = useRef(true)
  // The latest save: the controls below keep their identity from one render to the next
  const latestSave = useRef(save)
  useLayoutEffect(() => {
    latestSave.current = save
  })

  const flush = useCallback((): Promise<boolean> => {
    window.clearTimeout(timer.current)
    chain.current = chain.current.then(async () => {
      if (!dirty.current) return true
      dirty.current = false
      sending.current = true
      setStatus('saving')
      const saved = await succeeded(latestSave.current())
      sending.current = false
      if (saved) {
        failures.current = 0
        setStatus(dirty.current ? 'pending' : 'saved')
        return true
      }
      dirty.current = true
      setStatus('error')
      const delay = RETRY_DELAYS[Math.min(failures.current++, RETRY_DELAYS.length - 1)]
      if (mounted.current) timer.current = window.setTimeout(() => void flush(), delay)
      return false
    })
    return chain.current
  }, [])

  const queue = useCallback(() => {
    dirty.current = true
    setStatus((current) => (current === 'error' ? current : 'pending'))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY)
  }, [flush])

  // Drops the changes not sent yet, e.g. for a document that was just deleted
  const cancel = useCallback(() => {
    window.clearTimeout(timer.current)
    dirty.current = false
    setStatus('saved')
  }, [])

  const flushOnLeave = useEffectEvent(() => void flush())
  useEffect(() => {
    // Tab reload or close: the browser warns while changes are not saved yet
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || sending.current) e.preventDefault()
    }
    mounted.current = true
    window.addEventListener('beforeunload', warn)
    return () => {
      mounted.current = false
      window.removeEventListener('beforeunload', warn)
      // In-app navigation elsewhere (the component unmounts): send whatever is still pending
      flushOnLeave()
    }
  }, [])

  return { status, queue, flush, cancel }
}

// What a field or editor that saves on its own lets others do: save now, or drop its changes
export type SaveControls = Pick<ReturnType<typeof useAutosave>, 'flush' | 'cancel'>
