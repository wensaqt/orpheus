import type { Composition } from '@/payload-types'

// Types dérivés du schéma Payload (payload-types.ts), jamais redéclarés à la main

// État Lexical sérialisé, typé par le jsonSchema du champ content
export type LexicalContent = NonNullable<Composition['content']>

// Modification partielle envoyée par l'éditeur : seuls ces champs sont modifiables
export type CompositionPatch = Partial<Pick<Composition, 'title' | 'content'>>

// Ce qu'une carte de la liste affiche : jamais le contenu complet, seulement son extrait
export type CompositionCardData = Pick<Composition, 'id' | 'title' | 'updatedAt'> &
  Pick<Composition['page'], 'format' | 'orientation'> & { excerpt: string }

export type DeleteCompositionResult = { status: 'deleted' | 'error' }
