import type { BinderNodeData } from '@/lib/binder/tree'
import type { BinderItem } from '@/payload-types'

// Types derived from the Payload schema (payload-types.ts), never redeclared by hand

// Serialized Lexical state, typed by the content field's jsonSchema
export type LexicalContent = NonNullable<BinderItem['content']>

// The document open in the editor; updatedAt tells a newer server version from a cached one
export type EditorDocument = Pick<BinderItem, 'id' | 'title' | 'updatedAt'> & {
  content: LexicalContent | null
  documentType: BinderItem['documentType']
  scoreXml: string | null
}

// One line of the binder column: its place in the tree and its title, never its content
export type BinderEntry = BinderNodeData &
  Pick<BinderItem, 'title'> & {
    documentType?: BinderItem['documentType']
  }

// The text of a document as some version of the server had it
export type DocumentText = Pick<EditorDocument, 'content' | 'updatedAt'>

// checkedAt: when the server last confirmed this version (ms since the epoch)
export type DocumentSnapshot =
  | (DocumentText & { documentType: 'text' })
  | (Pick<EditorDocument, 'scoreXml' | 'updatedAt'> & { documentType: 'score'; content: null })

export type CachedDocument = DocumentSnapshot & { checkedAt: number }

// A document in the client cache, or where its loading stands
export type DocumentSlot =
  | { status: 'ready'; document: CachedDocument }
  | { status: 'loading' }
  // Gone or never readable (deleted, someone else's): asking again would not change that
  | { status: 'missing' }
  | { status: 'error' }
