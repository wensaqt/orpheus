'use client'

import { createEmptyHistoryState } from '@lexical/history'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect, useState } from 'react'

import { registerPublishedHistory } from '../history'

/*
 * Undo and redo for the editor, publishing what there is to undo or redo (see history.ts).
 * The history lives as long as the plugin, so registering again (StrictMode, Fast Refresh)
 * keeps it, as with Lexical's own plugin.
 */
export function HistoryPlugin() {
  const [editor] = useLexicalComposerContext()
  const [historyState] = useState(createEmptyHistoryState)
  useEffect(() => registerPublishedHistory(editor, historyState), [editor, historyState])
  return null
}
