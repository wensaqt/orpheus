'use client'

import { type HistoryState, registerHistory } from '@lexical/history'
import type { LexicalEditor } from 'lexical'
import { useCallback, useSyncExternalStore } from 'react'

import type { HistoryAvailability } from './types'

const NOTHING: HistoryAvailability = { canUndo: false, canRedo: false }

/*
 * Each editor's history, as its HistoryPlugin last published it, for the tools outside its
 * composer (the toolbar). A store rather than Lexical's deprecated CAN_UNDO and CAN_REDO
 * commands: those only report changes, while a store always holds the current value, for a
 * subscriber however late.
 */
const availability = new WeakMap<LexicalEditor, HistoryAvailability>()
const listeners = new WeakMap<LexicalEditor, Set<() => void>>()

// How long consecutive changes merge into one undo step: Lexical's own plugin's default
const MERGE_DELAY_MS = 1000

const historyOf = (editor: LexicalEditor | null) => (editor && availability.get(editor)) ?? NOTHING

const sameAvailability = (a: HistoryAvailability, b: HistoryAvailability) =>
  a.canUndo === b.canUndo && a.canRedo === b.canRedo

// Called each time an editor's history changes; tells the subscribers only of a new availability
export function publishHistory(editor: LexicalEditor, { undoStack, redoStack }: HistoryState) {
  const next = { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
  if (sameAvailability(historyOf(editor), next)) return
  availability.set(editor, next)
  listeners.get(editor)?.forEach((listener) => listener())
}

function subscribe(editor: LexicalEditor | null, listener: () => void) {
  if (!editor) return () => {}
  const set = listeners.get(editor) ?? new Set()
  listeners.set(editor, set)
  set.add(listener)
  return () => set.delete(listener)
}

/*
 * Undo and redo for the editor, as Lexical's HistoryPlugin, also publishing whether there is
 * something to undo or redo: once registered, and at every change of the history, a clear
 * included. Returns the unregistration.
 */
export const registerPublishedHistory = (editor: LexicalEditor, state: HistoryState) =>
  registerHistory(editor, state, MERGE_DELAY_MS, Date.now, (next) => publishHistory(editor, next))

// What the editor can undo and redo now, and again whenever that changes
export function useHistoryAvailability(editor: LexicalEditor | null) {
  // Stable for an editor: a new one would subscribe again at every render
  const subscribeToEditor = useCallback(
    (listener: () => void) => subscribe(editor, listener),
    [editor],
  )
  return useSyncExternalStore(
    subscribeToEditor,
    () => historyOf(editor),
    () => NOTHING,
  )
}
