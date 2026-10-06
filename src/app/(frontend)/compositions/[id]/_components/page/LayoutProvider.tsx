'use client'

import { createContext, type ReactNode, use, useState } from 'react'

import type { Layout } from '@/lib/layout'

import { saveLayout } from '@front/_features/compositions/actions'
import type { SaveStatus } from '@front/_hooks/types'
import { useAutosave } from '@front/_hooks/useAutosave'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/saverKeys'

type LayoutValue = {
  // The composition's layout as shown: every change applies at once, and saves on its own
  layout: Layout
  // From the latest layout, so that quick changes (a drag) never start from a stale one
  change: (update: (layout: Layout) => Layout) => void
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
  const [layout, setLayout] = useState(initial)
  const autosave = useAutosave(() => saveLayout(compositionId, layout))
  useRegisterSaver(SAVERS.layout, autosave)

  const change = (update: (layout: Layout) => Layout) => {
    setLayout(update)
    autosave.queue()
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
