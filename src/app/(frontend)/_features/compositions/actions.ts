'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { DEFAULT_PAGE_FORMAT } from '@/lib/pageFormats'

import { ROUTES } from '@front/_lib/routes'
import { authedAction, requireUser } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'

import type { CompositionPatch, DeleteCompositionResult } from './types'

// Creates an empty composition for the signed-in user and opens the editor
export async function createComposition() {
  const { payload, user } = await requireUser(ROUTES.home)
  const t = await getT()
  const composition = await payload.create({
    collection: 'compositions',
    data: {
      // In the user's language; the collection default is only a fallback
      title: t('compositions.untitled'),
      owner: user.id,
      page: { format: DEFAULT_PAGE_FORMAT, orientation: 'portrait' },
    },
    user,
    overrideAccess: false,
    // Read by the collection, which adds a first empty document under this title
    context: { firstDocumentTitle: t('binder.untitledDocument') },
  })
  redirect(ROUTES.composition(composition.id))
}

/*
 * Partial save from the editor. Allowlist: only the title can be changed here; its validity
 * (type, length) is checked by the collection. The text is saved per document (saveDocument).
 */
export const saveComposition = authedAction(
  async ({ payload, user }, id: number, { title }: CompositionPatch) => {
    const { updatedAt } = await payload.update({
      collection: 'compositions',
      id,
      data: { title },
      user,
      overrideAccess: false,
      depth: 0,
    })
    return { updatedAt }
  },
)

// Deletes one of the user's compositions; owner access is checked by Payload
export const deleteComposition = authedAction(
  async ({ payload, user }, id: number): Promise<DeleteCompositionResult> => {
    try {
      await payload.delete({ collection: 'compositions', id, user, overrideAccess: false })
    } catch {
      return { status: 'error' }
    }
    revalidatePath(ROUTES.compositions)
    return { status: 'deleted' }
  },
)
