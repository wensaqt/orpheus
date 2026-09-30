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
