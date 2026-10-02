'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'
import { useEffect } from 'react'

import { $createPageBreakNode } from '../nodes/PageBreakNode'

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
          if (!event || !(event.metaKey || event.ctrlKey)) return false
          event.preventDefault()
          // Command listeners already run inside an editor update
          $insertNodeToNearestRoot($createPageBreakNode())
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor],
  )

  return null
}
