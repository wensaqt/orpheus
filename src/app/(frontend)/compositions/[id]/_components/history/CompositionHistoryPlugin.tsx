'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import type { Id } from '@/lib/ids'
import { useEditorHistory } from './HistoryProvider'
import { registerCompositionHistory } from './lexicalHistory'

export function CompositionHistoryPlugin({ id }: { id: Id }) {
  const [editor] = useLexicalComposerContext()
  const history = useEditorHistory()
  useEffect(() => registerCompositionHistory(editor, id, history), [editor, id, history])
  return null
}
