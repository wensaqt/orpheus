'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react'

import type { Id } from '@/lib/ids'

import { loadBinderEntries } from '@front/_features/binder/actions'
import type { BinderEntry } from '@front/_features/binder/types'
import type { SaveControls } from '@front/_hooks/useAutosave'
import { useStoredState } from '@front/_hooks/useStoredState'
import { STORAGE_KEYS } from '@front/_lib/preferences'

import { applyBinderOp, type BinderOp } from './binderOps'
import { type BinderCommands, useBinderCommands } from './useBinderCommands'
import { useOpenDocument } from './useOpenDocument'
import { useSaveRegistry } from './useSaveRegistry'

type BinderContextValue = {
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
  entries: serverEntries,
  children,
}: BinderProviderProps) {
  const [saved, setSaved] = useState(serverEntries)
  const [entries, showOp] = useOptimistic(saved, applyBinderOp)
  // Set by the first local change: from then on, this tab's binder is the newer one
  const changedHere = useRef(false)
  const apply = useCallback((op: BinderOp) => {
    changedHere.current = true
    setSaved((list) => applyBinderOp(list, op))
  }, [])

  /*
   * The layout may come back from the router's cache (browser back button): check the server,
   * unless the writer has already changed something here (a title typed meanwhile)
   */
  useEffect(() => {
    void loadBinderEntries(compositionId)
      .then((result) => {
        if (result.status === 'done' && !changedHere.current) setSaved(result.data)
      })
      .catch(() => {})
  }, [compositionId])

  const [collapsedIds, setCollapsedIds] = useStoredState<Id[]>(
    STORAGE_KEYS.collapsedFolders(compositionId),
    [],
  )
  const collapsed = useMemo(() => new Set(collapsedIds), [collapsedIds])
  const setFolderOpen = useCallback(
    (id: Id, open: boolean) => {
      if (collapsed.has(id) !== open) return
      const next = new Set(collapsed)
      if (open) next.delete(id)
      else next.add(id)
      // Folders deleted since are forgotten along the way
      setCollapsedIds([...next].filter((folder) => saved.some((entry) => entry.id === folder)))
    },
    [collapsed, saved, setCollapsedIds],
  )

  const [renamingId, setRenamingId] = useState<Id | null>(null)
  const { register, flushAll, cancelDocuments } = useSaveRegistry()
  const activeDocumentId = useOpenDocument(compositionId, flushAll)

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
