'use client'

import type { LexicalEditor } from 'lexical'
import { createContext, type Dispatch, type SetStateAction, use, useEffect, useRef } from 'react'

type OpenEditor = {
  editor: LexicalEditor | null
  setEditor: Dispatch<SetStateAction<LexicalEditor | null>>
}

/*
 * The open document's editor, for the tools around it (the ruler, the page setup): changing
 * the pages must not take the writer out of the text
 */
export const OpenEditorContext = createContext<OpenEditor>({ editor: null, setEditor: () => {} })

export const useOpenEditor = () => use(OpenEditorContext).editor

// Called by the open document's editor, for as long as it is mounted
export function useRegisterOpenEditor(editor: LexicalEditor) {
  const { setEditor } = use(OpenEditorContext)
  useEffect(() => {
    setEditor(editor)
    // Unless the next document's editor has already taken its place
    return () => setEditor((current) => (current === editor ? null : current))
  }, [editor, setEditor])
}

// Whether the writer is in the text: the focus is in the editor
export const isWriting = (editor: LexicalEditor | null) =>
  Boolean(editor?.getRootElement()?.contains(document.activeElement))

/*
 * For a tool that takes the focus for a moment (fields in a popover): remember() before it
 * does, restore() once done, and the writer is back in the text, where the caret was
 */
export function useFocusReturn() {
  const editor = useOpenEditor()
  const wasWriting = useRef(false)
  return {
    remember: () => {
      wasWriting.current = isWriting(editor)
    },
    restore: () => {
      if (wasWriting.current) editor?.focus()
      wasWriting.current = false
    },
  }
}
