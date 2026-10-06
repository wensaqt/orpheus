import { isLexicalContent } from '@/lib/lexical'
import type { LexicalEditor } from 'lexical'

import type { LexicalContent } from '@front/_features/binder/types'

/*
 * A text as the content field stores it, and as Lexical serializes it. The field's type is the
 * minimal schema Payload validates (a root holding objects), Lexical's is node by node: neither
 * type is assignable to the other, so these bridge them without an assertion.
 */

// The editor's text, to save. Lexical always serializes a root and its children
export function readContent(editor: LexicalEditor): LexicalContent {
  const content: unknown = editor.getEditorState().toJSON()
  if (!isLexicalContent(content)) throw new Error('The editor state has no root to save')
  return content
}

/*
 * A stored text, as Lexical reads it: from a JSON string, which it parses and checks node by
 * node. Its object form would need every node's fields, which the stored type does not list.
 */
export const toEditorStateJson = (content: LexicalContent) => JSON.stringify(content)
