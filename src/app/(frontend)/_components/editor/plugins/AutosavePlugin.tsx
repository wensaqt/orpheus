'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  BLUR_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  HISTORY_MERGE_TAG,
  KEY_DOWN_COMMAND,
  mergeRegister,
} from 'lexical'
import { useEffect } from 'react'

import { isModShortcut } from '@front/_components/ui/shortcuts'
import type { LexicalContent } from '@front/_features/binder/types'
import { useAutosave } from '@front/_hooks/useAutosave'
import type { ActionResult } from '@front/_lib/actionResult'

import { readContent } from '../storedContent'

// Cmd/Ctrl+S saves now
const SAVE_KEY = 's'

/*
 * Saves the document from inside the editor (a hook, used under the composer). A change only
 * marks it dirty: the text is serialized when it is saved (after a pause, on blur, or on
 * Cmd/Ctrl+S), not at every keystroke, which keeps long documents fast.
 */
export function useAutosavePlugin(
  save: (content: LexicalContent) => Promise<ActionResult<unknown>>,
) {
  const [editor] = useLexicalComposerContext()
  const autosave = useAutosave(() => save(readContent(editor)))
  const { queue, flush } = autosave

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, tags }) => {
          /*
           * Same filter as Lexical's OnChangePlugin. Nothing dirty: only the selection moved.
           * History merge: the initial state, attaching the editable element, or nodes marked
           * dirty when a plugin registers its transforms; none of them is the writer's change.
           */
          if ((dirtyElements.size === 0 && dirtyLeaves.size === 0) || tags.has(HISTORY_MERGE_TAG)) {
            return
          }
          queue()
        }),
        editor.registerCommand(
          BLUR_COMMAND,
          () => {
            void flush()
            // Only listening: the editor's own blur handling goes on
            return false
          },
          COMMAND_PRIORITY_EDITOR,
        ),
        editor.registerCommand(
          KEY_DOWN_COMMAND,
          (event) => {
            if (!isModShortcut(event, SAVE_KEY)) return false
            // The browser would offer to save the web page
            event.preventDefault()
            void flush()
            return true
          },
          COMMAND_PRIORITY_EDITOR,
        ),
      ),
    [editor, queue, flush],
  )

  return autosave
}
