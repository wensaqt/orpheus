export const PARTS_OF_SPEECH = [
  'noun',
  'adjective',
  'verb',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
] as const

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

// Relations offered by the panel
export const RELATIONS = ['synonyms', 'antonyms'] as const
export type Relation = (typeof RELATIONS)[number]

// A group of related words: their part of speech and, if the source specifies it, the intended sense
export type WordGroup = {
  partsOfSpeech: PartOfSpeech[]
  sense: string | null
  words: string[]
}

export type LexiconResult = {
  relation: Relation
  query: string
  // Entry actually found (may differ from the query: "rapides" → "rapide"), or null
  word: string | null
  groups: WordGroup[]
  // Wiktionary page consulted, to credit (CC BY-SA), or null if nothing was found
  sourceUrl: string | null
}
