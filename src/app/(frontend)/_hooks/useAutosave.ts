import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'

import { type ActionResult, type ActionFailure, failed } from '@front/_lib/actionResult'

import { SaveStatus } from './types'

// Idle delay before saving
const AUTOSAVE_DELAY_MS = 800
// After a failure, tries again on its own, less and less often (the last delay repeats)
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000]

type SaveState = {
  dirty: boolean
  sending: boolean
  failures: number
  generation: number
  blocked?: ActionFailure['reason']
}

function statusOf(state: SaveState): SaveStatus {
  if (state.sending) return SaveStatus.Saving
  if (state.failures > 0) return SaveStatus.Error
  return state.dirty ? SaveStatus.Pending : SaveStatus.Saved
}

function beginSave(state: SaveState): void {
  state.dirty = false
  state.sending = true
}

function completeSave(state: SaveState, saved: boolean): number | undefined {
  state.sending = false
  if (saved) {
    state.failures = 0
    return undefined
  }
  state.dirty = true
  return RETRY_DELAYS[Math.min(state.failures++, RETRY_DELAYS.length - 1)]
}

function dropChanges(state: SaveState): void {
  state.generation++
  state.dirty = false
  state.sending = false
  state.failures = 0
  state.blocked = undefined
}

/*
 * Saves after a pause in the changes. queue() records that something changed; save() reads the
 * latest state itself when it runs. flush() saves now and tells whether it worked. Saves are
 * chained to keep their order; a failed one is retried, sooner if the writer keeps typing.
 */
export function useAutosave(save: () => Promise<ActionResult<unknown>>) {
  const [failure, setFailure] = useState<ActionFailure['reason']>()
  const [status, setStatus] = useState(SaveStatus.Saved)
  // Sending and dirty can coexist: edits made during a request need a later save.
  const state = useRef<SaveState>({ dirty: false, sending: false, failures: 0, generation: 0 })
  const timer = useRef<number | undefined>(undefined)
  const chain = useRef(Promise.resolve(true))
  // A retry must not outlive the component (e.g. a deleted document's editor)
  const mounted = useRef(true)
  // flush is also called by UI events and the save registry, outside effects.
  // Keep its identity stable while reading the latest committed save callback.
  const latestSave = useRef(save)
  useLayoutEffect(() => {
    latestSave.current = save
  })

  const publish = useCallback(() => {
    if (mounted.current) {
      setStatus(statusOf(state.current))
      setFailure(state.current.blocked)
    }
  }, [])

  const clearTimer = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  const scheduleSave = useCallback(
    (delay: number, run: () => void) => {
      clearTimer()
      timer.current = window.setTimeout(() => {
        timer.current = undefined
        run()
      }, delay)
    },
    [clearTimer],
  )

  const scheduleRetry = useCallback(
    (delay: number, retry: () => void) => {
      // New edits may already have scheduled a sooner attempt; keep that debounce.
      if (mounted.current && timer.current === undefined) scheduleSave(delay, retry)
    },
    [scheduleSave],
  )

  const attemptSave = useCallback(
    async (generation: number, retry: () => void): Promise<boolean> => {
      if (generation !== state.current.generation || !state.current.dirty) return true
      if (state.current.blocked) return false
      beginSave(state.current)
      publish()
      // Includes throws that happen before save returns its promise.
      const result: ActionResult<unknown> = await Promise.resolve()
        .then(() => latestSave.current())
        .catch(() => failed)
      const saved = result.status === 'done'
      if (generation !== state.current.generation) return true
      state.current.blocked = result.status === 'error' ? result.reason : undefined
      const delay = completeSave(state.current, saved)
      publish()
      if (delay !== undefined && !state.current.blocked) scheduleRetry(delay, retry)
      return saved
    },
    [publish, scheduleRetry],
  )

  const flush = useCallback(
    function flush(): Promise<boolean> {
      clearTimer()
      const generation = state.current.generation
      chain.current = chain.current.then(async () => {
        // A navigation flush must include edits made while its first request was in flight.
        do {
          if (!(await attemptSave(generation, () => void flush()))) return false
        } while (generation === state.current.generation && state.current.dirty)
        return true
      })
      return chain.current
    },
    [attemptSave, clearTimer],
  )

  const queue = useCallback(() => {
    state.current.dirty = true
    publish()
    if (!state.current.blocked) scheduleSave(AUTOSAVE_DELAY_MS, () => void flush())
  }, [flush, publish, scheduleSave])

  // Drops the changes not sent yet, e.g. for a document that was just deleted
  const cancel = useCallback(() => {
    clearTimer()
    dropChanges(state.current)
    publish()
  }, [clearTimer, publish])

  const flushOnLeave = useEffectEvent(() => void flush())
  useEffect(() => {
    // Tab reload or close: the browser warns while changes are not saved yet
    const warn = (e: BeforeUnloadEvent) => {
      if (state.current.dirty || state.current.sending) e.preventDefault()
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

  return { status, failure, queue, flush, cancel }
}

// What a field or editor that saves on its own lets others do: save now, or drop its changes
export type SaveControls = Pick<ReturnType<typeof useAutosave>, 'flush' | 'cancel'>
