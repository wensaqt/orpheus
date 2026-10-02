import 'server-only'

import { cache } from 'react'

import { type BinderNodeData, firstDocument, toBinderNode } from '@/lib/binder/tree'
import { relationId } from '@/lib/relationId'
import type { BinderItem } from '@/payload-types'

import { getSession, requireSession, type Session } from '@front/_lib/server/auth'

import type { BinderEntry, EditorDocument } from './types'

// A binder item reduced to its line in the binder column
export const toEntry = (
  item: Pick<BinderItem, 'id' | 'kind' | 'title' | 'parent' | 'position'>,
): BinderEntry => ({ ...toBinderNode(item), title: item.title })

// The structure of a binder (no content): what the binder column shows
export async function binderEntries({ payload, user }: Session, compositionId: number) {
  const { docs } = await payload.find({
    collection: 'binder-items',
    where: { composition: { equals: compositionId } },
    select: { kind: true, title: true, parent: true, position: true },
    user,
    overrideAccess: false,
    pagination: false,
    depth: 0,
  })
  return docs.map(toEntry)
}

/*
 * Composition shown in the editor with its binder, or null if nobody is signed in, or if it is
 * not found or someone else's (pages decide between login and 404). Memoised per request: the
 * editor's layout and page both need it.
 */
export const getBinder = cache(async (compositionId: number) => {
  const { payload, user } = await getSession()
  if (!user) return null
  const composition = await payload
    .findByID({
      collection: 'compositions',
      id: compositionId,
      user,
      overrideAccess: false,
      depth: 0,
    })
    .catch(() => null)
  if (!composition) return null
  return { composition, entries: await binderEntries({ payload, user }, composition.id) }
})

// A document of the composition with its text, or null (missing, a folder, or not this one)
export async function getDocument(
  compositionId: number,
  documentId: number,
): Promise<EditorDocument | null> {
  const { payload, user } = await requireSession()
  const item = await payload
    .findByID({ collection: 'binder-items', id: documentId, user, overrideAccess: false, depth: 0 })
    .catch(() => null)
  if (!item || item.kind !== 'document' || relationId(item.composition) !== compositionId) {
    return null
  }
  // Shape guaranteed on write by the field's jsonSchema
  return {
    id: item.id,
    title: item.title,
    content: item.content ?? null,
    updatedAt: item.updatedAt,
  }
}

/*
 * The first document of each given composition (reading order of its binder), with its content.
 * Two queries whatever the number of compositions: the structure of every binder, then the
 * content of the documents found.
 */
export async function firstDocuments(
  { payload, user }: Session,
  compositionIds: number[],
): Promise<Map<number, BinderItem>> {
  if (!compositionIds.length) return new Map()
  const { docs: structure } = await payload.find({
    collection: 'binder-items',
    where: { composition: { in: compositionIds } },
    select: { composition: true, kind: true, parent: true, position: true },
    user,
    overrideAccess: false,
    pagination: false,
    depth: 0,
  })

  const byComposition = new Map<number, BinderNodeData[]>()
  for (const item of structure) {
    const composition = relationId(item.composition)!
    byComposition.set(composition, [...(byComposition.get(composition) ?? []), toBinderNode(item)])
  }
  const firstIds = [...byComposition.values()].flatMap((nodes) => firstDocument(nodes)?.id ?? [])
  if (!firstIds.length) return new Map()

  const { docs } = await payload.find({
    collection: 'binder-items',
    where: { id: { in: firstIds } },
    user,
    overrideAccess: false,
    pagination: false,
    depth: 0,
  })
  return new Map(docs.map((doc) => [relationId(doc.composition)!, doc]))
}
