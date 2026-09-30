import type { Composition } from '@/payload-types'

// Types derived from the Payload schema (payload-types.ts), never redeclared by hand

// Serialized Lexical state, typed by the content field's jsonSchema
export type LexicalContent = NonNullable<Composition['content']>

// Partial update sent by the editor: only these fields can be changed
export type CompositionPatch = Partial<Pick<Composition, 'title' | 'content'>>

// What a list card shows: never the full content, only its excerpt
export type CompositionCardData = Pick<Composition, 'id' | 'title' | 'updatedAt'> & {
  excerpt: string
}

export type DeleteCompositionResult = { status: 'deleted' | 'error' }
