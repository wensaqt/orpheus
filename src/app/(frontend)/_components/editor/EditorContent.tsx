'use client'

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
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'

import styles from './EditorContent.module.css'

// Markdown shortcuts limited to the nodes the composer registers
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

// The editable text with its core plugins (history, lists, markdown shortcuts)
export function EditorContent({ placeholder }: { placeholder: string }) {
  return (
    <>
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
    </>
  )
}
