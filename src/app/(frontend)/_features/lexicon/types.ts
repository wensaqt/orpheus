import type { SynonymGroup } from '@/lib/thesaurus/types'

export type { PartOfSpeech, SynonymGroup } from '@/lib/thesaurus/types'

// A main group, flagged when it comes from Dicollecte (broader but noisier)
export type ResultGroup = SynonymGroup & { reliable: boolean }

export type SynonymResult = {
  query: string
  // Entry actually found: may differ from the query ("rapides" → "rapide", "marchait" →
  // "marcher"), or null
  word: string | null
  // Main synonyms: the Wiktionary's, plus Dicollecte's for parts of speech it does not cover
  groups: ResultGroup[]
  // Extra Dicollecte suggestions for parts of speech the Wiktionary covers, collapsed
  more: SynonymGroup[]
  // Wiktionary page to credit (CC BY-SA) when some synonyms come from it
  sourceUrl: string | null
}
