'use client'

import { type EditorState, type LexicalEditor, mergeRegister } from 'lexical'
import { useEffect, useState } from 'react'

import {
  $readFormatting,
  type Formatting,
  NO_FORMATTING,
  sameFormatting,
} from '@front/_components/editor/formatting'
import { type HistoryAvailability, useHistoryAvailability } from '@front/_components/editor/history'

export type ToolbarState = Formatting & HistoryAvailability

/*
 * What the menu bar and the style toolbar show, following the open document's selection from
 * outside its composer: every update (a selection moved is one) is read again. What can be
 * undone comes from the editor's own history (see history.ts).
 */
export function useToolbarState(editor: LexicalEditor | null): ToolbarState {
  const [formatting, setFormatting] = useState<Formatting>(NO_FORMATTING)
  const history = useHistoryAvailability(editor)

  useEffect(() => {
    setFormatting(NO_FORMATTING)
    if (!editor) return
    const read = (editorState: EditorState = editor.getEditorState()) => {
      // A read only: never an update while reading
      const formatting = editorState.read($readFormatting, { editor })
      const next = editor.isEditable() ? formatting : NO_FORMATTING
      setFormatting((current) => (sameFormatting(current, next) ? current : next))
    }
    read()
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => read(editorState)),
      editor.registerEditableListener(() => read()),
    )
  }, [editor])

  return { ...formatting, ...history }
}
