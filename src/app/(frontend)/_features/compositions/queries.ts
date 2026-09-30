import 'server-only'

import type { Payload, TypedUser } from 'payload'

import { toPageSettings } from '@/lib/pageFormats'

import { lexicalExcerpt } from './excerpt'
import type { CompositionCardData } from './types'

// Length of the preview shown on each sheet in the list
const EXCERPT_LENGTH = 320

type Session = { payload: Payload; user: TypedUser }

// The user's compositions, most recent first, reduced to their card
export async function listCompositionCards({ payload, user }: Session) {
  const { docs } = await payload.find({
    collection: 'compositions',
    user,
    overrideAccess: false,
    depth: 0,
    sort: '-updatedAt',
    select: { title: true, updatedAt: true, content: true },
    pagination: false,
  })

  // Content is reduced to its excerpt here, on the server, to keep the page light
  return docs.map((doc): CompositionCardData => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
    excerpt: lexicalExcerpt(doc.content, EXCERPT_LENGTH),
  }))
}

// Composition to edit, or null if not found or owned by someone else
export async function getCompositionForEditor({ payload, user }: Session, id: number) {
  const composition = await payload
    .findByID({ collection: 'compositions', id, user, overrideAccess: false, depth: 0 })
    .catch(() => null)
  if (!composition) return null

  return {
    id: composition.id,
    title: composition.title,
    // Shape guaranteed on write by the field's jsonSchema
    content: composition.content ?? null,
    page: toPageSettings(composition.page),
  }
}
