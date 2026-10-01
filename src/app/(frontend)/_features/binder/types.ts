import type { BinderItem } from '@/payload-types'

// Types derived from the Payload schema (payload-types.ts), never redeclared by hand

// Serialized Lexical state, typed by the content field's jsonSchema
export type LexicalContent = NonNullable<BinderItem['content']>

// Partial update sent by the editor for a document
export type DocumentPatch = Partial<Pick<BinderItem, 'content'>>

// The document open in the editor
export type EditorDocument = Pick<BinderItem, 'id' | 'title'> & { content: LexicalContent | null }
