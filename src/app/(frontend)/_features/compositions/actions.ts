'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'
import { DEFAULT_PAGE_FORMAT } from '@/lib/pageFormats'
import { cleanTitle } from '@/lib/titles'

import { type ActionResult, done, failed } from '@front/_lib/actionResult'
import { ROUTES } from '@front/_lib/routes'
import { authedAction, requireUser } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'
import { isId } from '@front/_lib/validation'

import type { CompositionPatch } from './types'

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

// Saves the composition's title (the text is saved per document); an empty one is refused
export const saveComposition = authedAction(
  async ({ payload, user }, id: number, { title }: CompositionPatch): Promise<ActionResult> => {
    const cleaned = cleanTitle(title, MAX_COMPOSITION_TITLE_LENGTH)
    if (!isId(id) || !cleaned) return failed
    try {
      await payload.update({
        collection: 'compositions',
        id,
        data: { title: cleaned },
        user,
        overrideAccess: false,
        depth: 0,
      })
      return done()
    } catch {
      return failed
    }
  },
)

// Deletes one of the user's compositions; owner access is checked by Payload
export const deleteComposition = authedAction(
  async ({ payload, user }, id: number): Promise<ActionResult> => {
    if (!isId(id)) return failed
    try {
      await payload.delete({ collection: 'compositions', id, user, overrideAccess: false })
    } catch {
      return failed
    }
    revalidatePath(ROUTES.compositions)
    return done()
  },
)
