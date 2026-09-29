'use client'

import { ListItemNode, ListNode } from '@lexical/list'
import {
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HEADING,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
} from '@lexical/markdown'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { EditorState } from 'lexical'
import React from 'react'

import styles from './RichTextEditor.module.css'
import { editorTheme } from './theme'

// Raccourcis Markdown limités aux nœuds enregistrés ci-dessous
const TRANSFORMERS = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
]

const NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode]

type RichTextEditorProps = {
  // État Lexical sérialisé à charger, ou vide pour un document neuf
  initialContent?: Record<string, unknown> | null
  placeholder: string
  onChange: (content: Record<string, unknown>) => void
}

export function RichTextEditor({ initialContent, placeholder, onChange }: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'orpheus',
    theme: editorTheme,
    nodes: NODES,
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
    onError: (error: Error) => {
      throw error
    },
  }

  const handleChange = (editorState: EditorState) => {
    onChange(editorState.toJSON() as unknown as Record<string, unknown>)
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={styles.editor}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={styles.content}
              aria-placeholder={placeholder}
              placeholder={<p className={styles.placeholder}>{placeholder}</p>}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
    </LexicalComposer>
  )
}
