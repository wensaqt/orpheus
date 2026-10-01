'use server'

import { authedAction } from '@front/_lib/server/auth'

import type { DocumentPatch } from './types'

/*
 * Partial save of a document from the editor. Allowlist: only the content can be changed here;
 * its shape is checked by the collection, which also refuses content on a folder.
 */
export const saveDocument = authedAction(
  async ({ payload, user }, id: number, { content }: DocumentPatch) => {
    const { updatedAt } = await payload.update({
      collection: 'binder-items',
      id,
      data: { content },
      user,
      overrideAccess: false,
      depth: 0,
    })
    return { updatedAt }
  },
)
