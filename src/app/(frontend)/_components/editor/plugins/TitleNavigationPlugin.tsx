'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, KEY_ARROW_UP_COMMAND } from 'lexical'
import { type RefObject, useEffect } from 'react'

import { $isAtDocumentStart } from '../selection'

/*
 * The title above the sheet and the text read as one page: the up arrow at the very start of
 * the text goes back to the title. (Enter in the title comes down to the text; see its field.)
 */
export function TitleNavigationPlugin({ title }: { title: RefObject<HTMLElement | null> }) {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        // Command handlers run inside an update: the selection can be read directly
        (event) => {
          if (!title.current || !$isAtDocumentStart()) return false
          event.preventDefault()
          title.current.focus()
          return true
        },
        // Ahead of the rich text plugin's own up arrow handling (editor priority)
        COMMAND_PRIORITY_LOW,
      ),
    [editor, title],
  )

  return null
}
