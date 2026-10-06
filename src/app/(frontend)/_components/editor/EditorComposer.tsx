'use client'

import { ListItemNode, ListNode } from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { ReactNode } from 'react'

import type { LexicalContent } from '@front/_features/binder/types'

import { toEditorStateJson } from './storedContent'
import { PageBreakNode } from './nodes/PageBreakNode'
import { editorTheme } from './theme'

const EDITOR_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, PageBreakNode]

type EditorComposerProps = {
  // Serialized Lexical state to load, or null for a new document
  initialContent: LexicalContent | null
  // The editable area and plugins, and anything else that needs the editor (e.g. the title)
  children: ReactNode
}

/*
 * The Lexical context of one document. Its initial state is read once: a different document
 * needs a new composer (keyed by document), which also keeps undo histories apart.
 */
export function EditorComposer({ initialContent, children }: EditorComposerProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'orpheus',
        theme: editorTheme,
        nodes: EDITOR_NODES,
        /*
         * The composer takes a JSON string, not a serialized object. A new document passes
         * undefined, not null: the composer then adds the empty paragraph the caret goes in
         */
        editorState: initialContent ? toEditorStateJson(initialContent) : undefined,
        onError: (error: Error) => {
          throw error
        },
      }}
    >
      {children}
    </LexicalComposer>
  )
}
