import type { PageFormat, PageOrientation } from '@/lib/pageFormats'

// Ce qu'une carte de la liste affiche : jamais le contenu complet, seulement son extrait
export type CompositionCardData = {
  id: number
  title: string
  updatedAt: string
  excerpt: string
  format: PageFormat
  orientation: PageOrientation
}

// État Lexical sérialisé (editorState.toJSON())
export type LexicalContent = Record<string, unknown>

// Modification partielle envoyée par l'éditeur
export type CompositionPatch = {
  title?: string
  content?: LexicalContent
}

export type DeleteCompositionResult = { status: 'deleted' | 'error' }
