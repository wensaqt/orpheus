'use client'

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import type { Id } from '@/lib/ids'

import type { BinderEntry } from '@front/_features/binder/types'
import type { SaveControls } from '@front/_hooks/useAutosave'

import { useT } from '@front/_components/i18n/I18nProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { useEditorHistory } from '../../history/HistoryProvider'
import { useBinderEntries } from './useBinderEntries'
import { useCollapsedFolders } from './useCollapsedFolders'
import { type BinderCommands, useBinderCommands } from './useBinderCommands'
import { useOpenDocument } from './useOpenDocument'
import { useSaveRegistry } from './useSaveRegistry'
import { useCompositionLeaveGuard } from './useCompositionLeaveGuard'

type BinderContextValue = {
  ownerId: Id
  compositionId: Id
  // The binder as shown: saved entries plus the changes still being saved
  entries: BinderEntry[]
  // The document shown in the editor (it follows the URL once everything is saved)
  activeDocumentId: Id | null
  collapsed: ReadonlySet<Id>
  setFolderOpen: (id: Id, open: boolean) => void
  // The item whose title is being edited in the tree, if any
  renamingId: Id | null
  setRenamingId: (id: Id | null) => void
  registerSaver: (key: string, controls: SaveControls) => () => void
  commands: BinderCommands
}

const BinderContext = createContext<BinderContextValue | null>(null)

type BinderProviderProps = {
  ownerId: Id
  compositionId: Id
  entries: BinderEntry[]
  children: ReactNode
}

/*
 * The binder of the composition being edited, shared by the binder column and the document
 * editor (a title typed on the sheet shows in the binder at once). Saved entries are state;
 * changes in flight are layered on top with useOptimistic, so a refused one disappears alone.
 */
export function BinderProvider({
  compositionId,
  ownerId,
  entries: serverEntries,
  children,
}: BinderProviderProps) {
  const history = useEditorHistory()
  const t = useT()
  const toast = useToast()
  const { entries, showOp, apply } = useBinderEntries(compositionId, serverEntries, () =>
    toast.error(t('binder.loadError')),
  )
  const { collapsed, setFolderOpen } = useCollapsedFolders(compositionId, entries)

  const [renamingId, setRenamingId] = useState<Id | null>(null)
  const { register, flushAll, cancelDocuments } = useSaveRegistry()
  useCompositionLeaveGuard(compositionId, flushAll)
  const { activeDocumentId, navigate } = useOpenDocument(compositionId, flushAll)

  useEffect(() => {
    history.configure({
      prepare: flushAll,
      openDocument: (id) => navigate(id),
      reportError: () => toast.error(t('editor.historyError')),
    })
  }, [history, flushAll, navigate, t, toast])

  const commands = useBinderCommands({
    compositionId,
    entries,
    activeDocumentId,
    apply,
    showOp,
    navigate,
    cancelDocuments,
    startRename: setRenamingId,
  })

  const value = useMemo(
    () => ({
      compositionId,
      ownerId,
      entries,
      activeDocumentId,
      collapsed,
      setFolderOpen,
      renamingId,
      setRenamingId,
      registerSaver: register,
      commands,
    }),
    [
      compositionId,
      ownerId,
      entries,
      activeDocumentId,
      collapsed,
      setFolderOpen,
      renamingId,
      register,
      commands,
    ],
  )

  return <BinderContext value={value}>{children}</BinderContext>
}

export function useBinder() {
  const binder = useContext(BinderContext)
  if (!binder) throw new Error('useBinder must be used inside <BinderProvider>')
  return binder
}

// Registers a field or editor that saves on its own, for as long as it is mounted
export function useRegisterSaver(key: string, { flush, cancel }: SaveControls) {
  const { registerSaver } = useBinder()
  useEffect(() => registerSaver(key, { flush, cancel }), [registerSaver, key, flush, cancel])
}
