'use client'

import { createContext, type ReactNode, use, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { savePageSettings } from '@front/_features/compositions/actions'
import { type SaveStatus, useAutosave } from '@front/_hooks/useAutosave'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/useSaveRegistry'

type PageSettingsValue = {
  // The composition's pages as shown: every change applies at once, and saves on its own
  settings: PageSettings
  change: (next: PageSettings) => void
  status: SaveStatus
}

const PageSettingsContext = createContext<PageSettingsValue | null>(null)

/*
 * The composition's page settings (format, orientation, margins), shared by the toolbar, the
 * ruler and the pages. A change shows at once and is saved shortly after, like the text;
 * leaving the composition first waits for it.
 */
export function PageSettingsProvider({
  initial,
  children,
}: {
  initial: PageSettings
  children: ReactNode
}) {
  const { compositionId } = useBinder()
  const [settings, setSettings] = useState(initial)
  const autosave = useAutosave(() => savePageSettings(compositionId, settings))
  useRegisterSaver(SAVERS.pageSettings, autosave)

  const change = (next: PageSettings) => {
    setSettings(next)
    autosave.queue()
  }

  return (
    <PageSettingsContext value={{ settings, change, status: autosave.status }}>
      {children}
    </PageSettingsContext>
  )
}

export function usePageSettings() {
  const value = use(PageSettingsContext)
  if (!value) throw new Error('usePageSettings must be used inside <PageSettingsProvider>')
  return value
}
