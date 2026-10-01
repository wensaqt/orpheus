import 'server-only'

import { toPageSettings } from '@/lib/pageFormats'

import { firstDocuments } from '@front/_features/binder/queries'
import { requireSession } from '@front/_lib/server/auth'

import { lexicalExcerpt } from './excerpt'
import type { CompositionCardData } from './types'

// Length of the preview shown on each sheet in the list
const EXCERPT_LENGTH = 320

/*
 * Data access layer: every read guards itself with the session (memoised per request), so a page
 * cannot fetch compositions without a signed-in user, whatever it checked before.
 */

// The user's compositions, most recent first, reduced to their card
export async function listCompositionCards() {
  const session = await requireSession()
  const { docs } = await session.payload.find({
    collection: 'compositions',
    user: session.user,
    overrideAccess: false,
    depth: 0,
    sort: '-updatedAt',
    select: { title: true, updatedAt: true },
    pagination: false,
  })
  // The sheet previews the first document of the binder
  const firsts = await firstDocuments(
    session,
    docs.map((doc) => doc.id),
  )

  // Content is reduced to its excerpt here, on the server, to keep the page light
  return docs.map((doc): CompositionCardData => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
    excerpt: lexicalExcerpt(firsts.get(doc.id)?.content, EXCERPT_LENGTH),
  }))
}

// Composition to edit with its first document, or null if not found or owned by someone else
export async function getCompositionForEditor(id: number) {
  const session = await requireSession()
  const composition = await session.payload
    .findByID({
      collection: 'compositions',
      id,
      user: session.user,
      overrideAccess: false,
      depth: 0,
    })
    .catch(() => null)
  if (!composition) return null
  const first = (await firstDocuments(session, [composition.id])).get(composition.id)

  return {
    id: composition.id,
    title: composition.title,
    page: toPageSettings(composition.page),
    // Shape guaranteed on write by the field's jsonSchema
    document: first ? { id: first.id, title: first.title, content: first.content ?? null } : null,
  }
}
