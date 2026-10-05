'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'
import { DEFAULT_PAGE, type PageSettings, parsePageSettings } from '@/lib/pageFormats'
import { cleanTitle } from '@/lib/titles'
import type { Id } from '@/lib/ids'
import { isId } from '@/lib/ids'

import { type ActionResult, done, failed } from '@front/_lib/actionResult'
import { ROUTES } from '@front/_lib/routes'
import { authedAction, requireUser } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'

import type { CompositionPatch } from './types'

// Creates an empty composition for the signed-in user and opens its first document
export async function createComposition() {
  const { payload, user } = await requireUser(ROUTES.home)
  const t = await getT()
  const composition = await payload.create({
    collection: 'compositions',
    data: {
      // In the user's language; the collection default is only a fallback
      title: t('compositions.untitled'),
      owner: user.id,
      page: DEFAULT_PAGE,
    },
    user,
    overrideAccess: false,
    // Read by the collection, which adds a first empty document under this title
    context: { firstDocumentTitle: t('binder.untitledDocument') },
  })
  // Straight to that document: the composition's own page would only redirect to it
  const { docs } = await payload.find({
    collection: 'binder-items',
    where: { composition: { equals: composition.id } },
    select: {},
    limit: 1,
    depth: 0,
    user,
    overrideAccess: false,
  })
  redirect(ROUTES.editor(composition.id, docs[0]?.id ?? null))
}

// Saves the composition's title (the text is saved per document); an empty one is refused
export const saveComposition = authedAction(
  async ({ payload, user }, id: Id, { title }: CompositionPatch): Promise<ActionResult> => {
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

// Saves the composition's page settings (format, orientation, margins), checked whole
export const savePageSettings = authedAction(
  async ({ payload, user }, id: Id, settings: PageSettings): Promise<ActionResult> => {
    const page = parsePageSettings(settings)
    if (!isId(id) || !page) return failed
    try {
      await payload.update({
        collection: 'compositions',
        id,
        data: { page },
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
  async ({ payload, user }, id: Id): Promise<ActionResult> => {
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
