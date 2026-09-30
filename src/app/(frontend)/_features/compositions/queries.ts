import 'server-only'

import type { Payload, TypedUser } from 'payload'

import { toPageSettings } from '@/lib/pageFormats'

import { lexicalExcerpt } from './excerpt'
import type { CompositionCardData } from './types'

// Longueur de l'aperçu affiché sur chaque feuille de la liste
const EXCERPT_LENGTH = 320

type Session = { payload: Payload; user: TypedUser }

// Compositions de l'utilisateur, les plus récentes d'abord, réduites à leur carte
export async function listCompositionCards({ payload, user }: Session) {
  const { docs } = await payload.find({
    collection: 'compositions',
    user,
    overrideAccess: false,
    depth: 0,
    sort: '-updatedAt',
    select: { title: true, updatedAt: true, content: true, page: true },
    pagination: false,
  })

  // Le contenu est réduit à son extrait ici, côté serveur, pour garder la page légère
  return docs.map((doc): CompositionCardData => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
    excerpt: lexicalExcerpt(doc.content, EXCERPT_LENGTH),
    format: doc.page.format,
    orientation: doc.page.orientation,
  }))
}

// Composition à éditer, ou null si introuvable ou appartenant à quelqu'un d'autre
export async function getCompositionForEditor({ payload, user }: Session, id: number) {
  const composition = await payload
    .findByID({ collection: 'compositions', id, user, overrideAccess: false, depth: 0 })
    .catch(() => null)
  if (!composition) return null

  return {
    id: composition.id,
    title: composition.title,
    // Forme garantie à l'écriture par le jsonSchema du champ
    content: composition.content ?? null,
    page: toPageSettings(composition.page),
  }
}
