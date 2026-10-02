'use client'

import { useParams } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
} from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { loadBinderEntries } from '@front/_features/binder/actions'
import type { BinderEntry } from '@front/_features/binder/types'
import type { SaveControls } from '@front/_hooks/useAutosave'
import { useStoredState } from '@front/_hooks/useStoredState'
import { STORAGE_KEYS } from '@front/_lib/preferences'
import { parseId } from '@front/_lib/validation'

import { applyBinderOp, type BinderOp } from './binderOps'
import { type BinderCommands, useBinderCommands } from './useBinderCommands'
import { useSaveRegistry } from './useSaveRegistry'

type BinderContextValue = {
  compositionId: number
  page: PageSettings
  // The binder as shown: saved entries plus the changes still being saved
  entries: BinderEntry[]
  // The document open in the editor, from the URL
  activeDocumentId: number | null
  collapsed: ReadonlySet<number>
  setFolderOpen: (id: number, open: boolean) => void
  // The item whose title is being edited in the tree, if any
  renamingId: number | null
  setRenamingId: (id: number | null) => void
  registerSaver: (key: string, controls: SaveControls) => () => void
  commands: BinderCommands
}

const BinderContext = createContext<BinderContextValue | null>(null)

type BinderProviderProps = {
  compositionId: number
  page: PageSettings
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
  page,
  entries: serverEntries,
  children,
}: BinderProviderProps) {
  const [saved, setSaved] = useState(serverEntries)
  const [entries, showOp] = useOptimistic(saved, applyBinderOp)
  const apply = useCallback((op: BinderOp) => setSaved((list) => applyBinderOp(list, op)), [])

  // The layout may come back from the router's cache (browser back button): check the server
  useEffect(() => {
    void loadBinderEntries(compositionId)
      .then((result) => result.status === 'done' && setSaved(result.data))
      .catch(() => {})
  }, [compositionId])

  const { documentId } = useParams<{ documentId?: string }>()
  const activeDocumentId = documentId ? parseId(documentId) : null

  const [collapsedIds, setCollapsedIds] = useStoredState<number[]>(
    STORAGE_KEYS.collapsedFolders(compositionId),
    [],
  )
  const collapsed = useMemo(() => new Set(collapsedIds), [collapsedIds])
  const setFolderOpen = useCallback(
    (id: number, open: boolean) => {
      if (collapsed.has(id) !== open) return
      const next = new Set(collapsed)
      if (open) next.delete(id)
      else next.add(id)
      // Folders deleted since are forgotten along the way
      setCollapsedIds([...next].filter((folder) => saved.some((entry) => entry.id === folder)))
    },
    [collapsed, saved, setCollapsedIds],
  )

  const [renamingId, setRenamingId] = useState<number | null>(null)
  const { register, flushAll, cancelDocuments } = useSaveRegistry()

  const commands = useBinderCommands({
    compositionId,
    entries,
    activeDocumentId,
    apply,
    showOp,
    flushAll,
    cancelDocuments,
    startRename: setRenamingId,
  })

  const value = useMemo(
    () => ({
      compositionId,
      page,
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
      page,
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
