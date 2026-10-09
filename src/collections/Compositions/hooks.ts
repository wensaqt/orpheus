import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
} from 'payload'

import { DEFAULT_DOCUMENT_TITLE } from '@/lib/binder/constants'
import { toLayout } from '@/lib/layout'

// Before validation, since owner is required: the owner is always the user who creates it,
// never a submitted value
export const setOwnerOnCreate: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation === 'create' && data && req.user) data.owner = req.user.id
  return data
}

/*
 * The layout is stored fitted together (margins that leave room for text, an indent within
 * the text), whoever writes it: each field alone is checked by its own bounds only
 */
export const fitLayoutOnChange: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const page = data.page ?? originalDoc?.page
  if (!page?.format || !page.orientation) return data
  const layout = toLayout({ page, typography: data.typography ?? originalDoc?.typography })
  return { ...data, page: { ...page, ...layout.page }, typography: layout.typography }
}

/*
 * A new composition starts with one empty document, so there is always a page to write on.
 * The app passes its title in the writer's language (context.firstDocumentTitle).
 */
export const addFirstDocument: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'create') return doc
  // Created elsewhere (e.g. the admin panel), it has no title in the writer's language
  const title = context.firstDocumentTitle ?? DEFAULT_DOCUMENT_TITLE
  await req.payload.create({
    collection: 'binder-items',
    // Owner and position are set by the binder's own hook; given here for the types
    data: {
      composition: doc.id,
      owner: doc.owner,
      kind: 'document',
      documentType: 'text',
      title,
      position: 0,
    },
    req,
  })
  return doc
}

// Deleting a composition deletes its whole binder
export const deleteBinder: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.db.deleteMany({
    collection: 'binder-items',
    where: { composition: { equals: id } },
    req,
  })
}
