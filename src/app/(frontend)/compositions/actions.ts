'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { DEFAULT_COMPOSITION_TITLE } from '@/collections/Compositions'
import { DEFAULT_PAGE_FORMAT } from '@/lib/pageFormats'

import { ROUTES } from '../_lib/routes'
import { getSession, requireUser } from '../_lib/session'

const MAX_TITLE_LENGTH = 200

export type CompositionPatch = {
  title?: string
  // État Lexical sérialisé (editorState.toJSON())
  content?: Record<string, unknown>
}

// Crée une composition vide pour l'utilisateur connecté et ouvre l'éditeur
export async function createComposition() {
  const { payload, user } = await requireUser(ROUTES.home)
  const composition = await payload.create({
    collection: 'compositions',
    data: {
      title: DEFAULT_COMPOSITION_TITLE,
      owner: user.id,
      page: { format: DEFAULT_PAGE_FORMAT, orientation: 'portrait' },
    },
    user,
    overrideAccess: false,
  })
  redirect(ROUTES.composition(composition.id))
}

// Sauvegarde partielle depuis l'éditeur ; l'accès par propriétaire est vérifié par Payload
export async function saveComposition(id: number, patch: CompositionPatch) {
  const { payload, user } = await getSession()
  if (!user) throw new Error('Unauthorized')

  const data: CompositionPatch = {}
  if (typeof patch.title === 'string') data.title = patch.title.slice(0, MAX_TITLE_LENGTH)
  if (patch.content && typeof patch.content === 'object' && 'root' in patch.content) {
    data.content = patch.content
  }

  const { updatedAt } = await payload.update({
    collection: 'compositions',
    id,
    data,
    user,
    overrideAccess: false,
    depth: 0,
  })
  return { updatedAt }
}

export type DeleteCompositionResult = { status: 'deleted' | 'error' }

// Supprime une composition de l'utilisateur ; l'accès par propriétaire est vérifié par Payload
export async function deleteComposition(id: number): Promise<DeleteCompositionResult> {
  const { payload, user } = await getSession()
  if (!user || !Number.isInteger(id)) return { status: 'error' }

  try {
    await payload.delete({ collection: 'compositions', id, user, overrideAccess: false })
  } catch {
    return { status: 'error' }
  }
  revalidatePath(ROUTES.compositions)
  return { status: 'deleted' }
}
