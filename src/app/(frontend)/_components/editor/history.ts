'use client'

import type { HistoryState } from '@lexical/history'
import type { LexicalEditor } from 'lexical'
import { useSyncExternalStore } from 'react'

// Whether an editor has something to undo and to redo
export type HistoryAvailability = { canUndo: boolean; canRedo: boolean }

const NOTHING: HistoryAvailability = { canUndo: false, canRedo: false }

/*
 * Each editor's history, as its HistoryPlugin last published it, for the tools outside its
 * composer (the toolbar). A store rather than Lexical's deprecated CAN_UNDO and CAN_REDO
 * commands: those only report changes, while a store always holds the current value, for a
 * subscriber however late.
 */
const availability = new WeakMap<LexicalEditor, HistoryAvailability>()
const listeners = new WeakMap<LexicalEditor, Set<() => void>>()

// Called by the editor's HistoryPlugin each time its history changes
export function publishHistory(editor: LexicalEditor, { undoStack, redoStack }: HistoryState) {
  const next = { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
  const current = historyOf(editor)
  if (current.canUndo === next.canUndo && current.canRedo === next.canRedo) return
  availability.set(editor, next)
  for (const listener of listeners.get(editor) ?? []) listener()
}

const historyOf = (editor: LexicalEditor | null) => (editor && availability.get(editor)) ?? NOTHING

function subscribe(editor: LexicalEditor | null, listener: () => void) {
  if (!editor) return () => {}
  const set = listeners.get(editor) ?? new Set()
  listeners.set(editor, set)
  set.add(listener)
  return () => set.delete(listener)
}

// What the editor can undo and redo now, and again whenever that changes
export const useHistoryAvailability = (editor: LexicalEditor | null) =>
  useSyncExternalStore(
    (listener) => subscribe(editor, listener),
    () => historyOf(editor),
    () => NOTHING,
  )
