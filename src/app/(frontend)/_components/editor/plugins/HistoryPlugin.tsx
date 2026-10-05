'use client'

import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

import { publishHistory } from '../history'

// How long consecutive changes merge into one undo step: Lexical's own plugin's default
const MERGE_DELAY = 1000

/*
 * Undo and redo for the editor, as Lexical's HistoryPlugin, also publishing whether there is
 * something to undo or redo (see history.ts): once registered, and at every change of the
 * history, a clear included.
 */
export function HistoryPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      registerHistory(editor, createEmptyHistoryState(), MERGE_DELAY, Date.now, (state) =>
        publishHistory(editor, state),
      ),
    [editor],
  )
  return null
}
