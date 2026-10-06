import type {
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from 'payload'
import { ValidationError } from 'payload'

import {
  type BinderNodeData,
  descendantIds,
  toBinderNode,
  wouldCreateCycle,
} from '@/lib/binder/tree'
import { relationId } from '@/lib/relationId'
import { nullIfUnreadable } from '@/lib/payloadErrors'
import type { Id } from '@/lib/ids'

const invalid = (path: string, message: string) =>
  new ValidationError({ collection: 'binder-items', errors: [{ path, message }] })

// The whole binder of a composition, reduced to its structure
async function loadStructure(req: PayloadRequest, composition: Id): Promise<BinderNodeData[]> {
  const { docs } = await req.payload.find({
    collection: 'binder-items',
    where: { composition: { equals: composition } },
    select: { kind: true, parent: true, position: true },
    pagination: false,
    depth: 0,
    req,
  })
  return docs.map(toBinderNode)
}

/*
 * Keeps every binder a well-formed tree, whoever writes to it:
 *   - the owner is the composition's owner, never a submitted value;
 *   - a parent is a folder of the same composition, and never the item itself or one of its
 *     descendants (which would detach a loop from the tree);
 *   - folders hold no content;
 *   - an item added or moved without a position goes after its new siblings.
 */
export const keepBinderTree: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  operation,
  req,
  context,
}) => {
  if (!data) return data
  const composition = relationId(data.composition ?? originalDoc?.composition)
  if (composition === null) throw invalid('composition', 'A binder item needs a composition.')

  if (operation === 'create') {
    const owner = await req.payload
      .findByID({ collection: 'compositions', id: composition, depth: 0, req })
      .then((doc) => relationId(doc.owner))
      .catch(nullIfUnreadable)
    if (owner === null) throw invalid('composition', 'This composition does not exist.')
    data.owner = owner
  }

  const kind = data.kind ?? originalDoc?.kind
  if (kind === 'folder' && data.content != null) {
    throw invalid('content', 'A folder has no content.')
  }

  /*
   * Only a new item, or one moved to another folder, needs the tree checked. On update, data
   * is the whole document with the changes applied, so a move shows as a different parent.
   */
  const parent = relationId(data.parent)
  const moved = operation === 'update' && parent !== relationId(originalDoc?.parent)
  if (operation !== 'create' && !moved) return data

  const items = await loadStructure(req, composition)
  if (parent !== null) {
    const target = items.find((item) => item.id === parent)
    if (!target) throw invalid('parent', 'The parent must belong to the same composition.')
    if (target.kind !== 'folder') throw invalid('parent', 'Only a folder can hold items.')
    if (operation === 'update' && wouldCreateCycle(items, originalDoc.id, parent)) {
      throw invalid('parent', 'A folder cannot be moved inside itself.')
    }
  }

  /*
   * Without a new position, the item goes last: on update an unchanged position is the old one,
   * meaningless in the new folder. A planned move (context.keepPosition) sets every position.
   */
  if (
    data.position == null ||
    (moved && !context.keepPosition && data.position === originalDoc?.position)
  ) {
    const siblings = items.filter((item) => item.parent === parent && item.id !== originalDoc?.id)
    data.position = siblings.length ? Math.max(...siblings.map((item) => item.position)) + 1 : 0
  }
  return data
}

// Deleting a folder deletes everything inside it, at any depth
export const deleteContents: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const item = await req.payload
    .findByID({ collection: 'binder-items', id, depth: 0, req })
    .catch(nullIfUnreadable)
  if (!item || item.kind !== 'folder') return
  const inside = descendantIds(await loadStructure(req, relationId(item.composition)), item.id)
  if (!inside.length) return
  // Straight to the database: the whole subtree goes at once, without a hook per item
  await req.payload.db.deleteMany({
    collection: 'binder-items',
    where: { id: { in: inside } },
    req,
  })
}
