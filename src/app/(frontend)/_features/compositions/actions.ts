'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { DEFAULT_COMPOSITION_TITLE } from '@/lib/compositions'
import { DEFAULT_PAGE_FORMAT } from '@/lib/pageFormats'

import { ROUTES } from '@front/_lib/routes'
import { getSession, requireUser } from '@front/_lib/server/session'

import type { CompositionPatch, DeleteCompositionResult } from './types'

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

/*
 * Sauvegarde partielle depuis l'éditeur. Liste blanche : seuls le titre et le contenu sont
 * modifiables ici. Leur validité (type, longueur, forme Lexical) est vérifiée par la collection.
 * Une clé undefined (sauvegarde du seul titre, par ex.) est ignorée par Payload.
 */
export async function saveComposition(id: number, { title, content }: CompositionPatch) {
  const { payload, user } = await getSession()
  if (!user) throw new Error('Unauthorized')

  const { updatedAt } = await payload.update({
    collection: 'compositions',
    id,
    data: { title, content },
    user,
    overrideAccess: false,
    depth: 0,
  })
  return { updatedAt }
}

// Supprime une composition de l'utilisateur ; l'accès par propriétaire est vérifié par Payload
export async function deleteComposition(id: number): Promise<DeleteCompositionResult> {
  const { payload, user } = await getSession()
  if (!user) return { status: 'error' }

  try {
    await payload.delete({ collection: 'compositions', id, user, overrideAccess: false })
  } catch {
    return { status: 'error' }
  }
  revalidatePath(ROUTES.compositions)
  return { status: 'deleted' }
}
