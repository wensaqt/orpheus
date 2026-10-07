'use client'

import { createContext, type ReactNode, use, useRef, useState } from 'react'

import type { Layout } from '@/lib/layout'

import { saveLayout } from '@front/_features/compositions/actions'
import type { SaveStatus } from '@front/_hooks/types'
import { useAutosave } from '@front/_hooks/useAutosave'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/saverKeys'
import { useEditorHistory } from '../history/HistoryProvider'

type LayoutValue = {
  // The composition's layout as shown: every change applies at once, and saves on its own
  layout: Layout
  // From the latest layout, so that quick changes (a drag) never start from a stale one
  change: (update: (layout: Layout) => Layout, group?: object) => void
  status: SaveStatus
}

const LayoutContext = createContext<LayoutValue | null>(null)

/*
 * The composition's layout (its pages, and how its text is set), shared by the toolbar, the
 * ruler and the pages. A change shows at once and is saved shortly after, like the text;
 * leaving the composition first waits for it.
 */
export function LayoutProvider({ initial, children }: { initial: Layout; children: ReactNode }) {
  const { compositionId } = useBinder()
  const history = useEditorHistory()
  const [layout, setLayout] = useState(initial)
  const latest = useRef(initial)
  const groups = useRef(
    new WeakMap<object, { before: Layout; after: Layout; generation: number }>(),
  )
  const autosave = useAutosave(() => saveLayout(compositionId, latest.current))
  useRegisterSaver(SAVERS.layout, autosave)

  const apply = (next: Layout) => {
    latest.current = next
    setLayout(next)
    autosave.queue()
  }
  const change = (update: (layout: Layout) => Layout, token?: object) => {
    if (history.getSnapshot().busy) return
    const before = latest.current
    const after = update(before)
    if (JSON.stringify(before) === JSON.stringify(after)) return
    const previous = token && groups.current.get(token)
    const generation = history.getSnapshot().generation
    const group =
      previous && previous.generation === generation && history.canMerge(previous)
        ? previous
        : { before, after, generation }
    group.after = after
    if (token) groups.current.set(token, group)
    apply(after)
    history.record(
      {
        scope: { kind: 'layout' },
        isEmpty: () => JSON.stringify(group.before) === JSON.stringify(group.after),
        undo: () => {
          apply(group.before)
          return true
        },
        redo: () => {
          apply(group.after)
          return true
        },
      },
      token ? group : undefined,
    )
  }

  return (
    <LayoutContext value={{ layout, change, status: autosave.status }}>{children}</LayoutContext>
  )
}

export function useLayout() {
  const value = use(LayoutContext)
  if (!value) throw new Error('useLayout must be used inside <LayoutProvider>')
  return value
}
