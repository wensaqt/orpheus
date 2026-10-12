import { useCallback, useEffect, useEffectEvent, useOptimistic, useState } from 'react'

import type { Id } from '@/lib/ids'
import { loadBinderEntries } from '@front/_features/binder/actions'
import type { BinderEntry } from '@front/_features/binder/types'
import { applyBinderOp, type BinderOp } from './binderOps'

export function useBinderEntries(
  compositionId: Id,
  initialEntries: BinderEntry[],
  onLoadError: () => void,
) {
  const [saved, setSaved] = useState({ compositionId, entries: initialEntries, changedHere: false })
  if (saved.compositionId !== compositionId) {
    setSaved({ compositionId, entries: initialEntries, changedHere: false })
  }
  const [entries, showOp] = useOptimistic(saved.entries, applyBinderOp)
  const apply = useCallback(
    (op: BinderOp) => {
      setSaved((current) =>
        current.compositionId === compositionId
          ? { ...current, changedHere: true, entries: applyBinderOp(current.entries, op) }
          : current,
      )
    },
    [compositionId],
  )
  const reportError = useEffectEvent(onLoadError)

  // Refresh cached layouts, but never overwrite edits made since this request began.
  useEffect(() => {
    let canceled = false
    void loadBinderEntries(compositionId)
      .then((result) => {
        if (canceled) return
        if (result.status !== 'done') {
          reportError()
          return
        }
        setSaved((current) =>
          current.compositionId === compositionId && !current.changedHere
            ? { ...current, entries: result.data }
            : current,
        )
      })
      .catch(() => {
        if (!canceled) reportError()
      })
    return () => {
      canceled = true
    }
  }, [compositionId])
  return { entries, showOp, apply }
}
