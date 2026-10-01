import 'server-only'

import type { Payload, TypedUser } from 'payload'

import { firstDocument } from '@/lib/binder/tree'
import { relationId } from '@/lib/relationId'
import type { BinderItem } from '@/payload-types'

type Session = { payload: Payload; user: TypedUser }

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

  const byComposition = new Map<number, ReturnType<typeof toNode>[]>()
  for (const item of structure) {
    const node = toNode(item)
    byComposition.set(node.composition, [...(byComposition.get(node.composition) ?? []), node])
  }
  const firstIds = [...byComposition.values()]
    .map((items) => firstDocument(items)?.id)
    .filter((id): id is number => id !== undefined)
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

const toNode = (item: Pick<BinderItem, 'id' | 'composition' | 'kind' | 'parent' | 'position'>) => ({
  id: item.id,
  composition: relationId(item.composition)!,
  kind: item.kind,
  parent: relationId(item.parent),
  position: item.position,
})
