import type { BinderNodeData } from '@/lib/binder/tree'
import type { BinderItem } from '@/payload-types'

// Types derived from the Payload schema (payload-types.ts), never redeclared by hand

// Serialized Lexical state, typed by the content field's jsonSchema
export type LexicalContent = NonNullable<BinderItem['content']>

// The document open in the editor; updatedAt tells a newer server version from a cached one
export type EditorDocument = Pick<BinderItem, 'id' | 'title' | 'updatedAt'> & {
  content: LexicalContent | null
}

// One line of the binder column: its place in the tree and its title, never its content
export type BinderEntry = BinderNodeData & Pick<BinderItem, 'title'>
