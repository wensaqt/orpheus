'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'
import { useEffect } from 'react'

import { isModShortcut } from '@front/_components/ui/shortcuts'

import { $insertPageBreak } from '../formatting'

/*
 * Cmd/Ctrl+Enter inserts a page break where the caret is, as in word processors; the caret
 * goes on to the next page.
 */
export function PageBreakPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      // Enter is its own command, handled by the rich text at EDITOR priority: this runs first
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          // No event: a composition (IME input) that ended with a line break
          if (!event || !isModShortcut(event, 'Enter')) return false
          event.preventDefault()
          // Command listeners already run inside an editor update
          $insertPageBreak()
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor],
  )

  return null
}
