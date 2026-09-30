import type { SynonymGroup } from '@/lib/thesaurus/types'

export type { PartOfSpeech, SynonymGroup } from '@/lib/thesaurus/types'

export type SynonymResult = {
  query: string
  // Entry actually found: may differ from the query ("rapides" → "rapide"), or null
  word: string | null
  groups: SynonymGroup[]
}
