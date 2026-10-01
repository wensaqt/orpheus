import type { Composition } from '@/payload-types'

// Types derived from the Payload schema (payload-types.ts), never redeclared by hand

// Partial update sent by the editor: only the title (the text belongs to documents)
export type CompositionPatch = Partial<Pick<Composition, 'title'>>

// What a list card shows: never the full content, only its excerpt
export type CompositionCardData = Pick<Composition, 'id' | 'title' | 'updatedAt'> & {
  excerpt: string
}

export type DeleteCompositionResult = { status: 'deleted' | 'error' }
