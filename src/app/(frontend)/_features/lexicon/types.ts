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

// Synonyms sharing a part of speech and, when the source states it, a sense
export type SynonymGroup = {
  partOfSpeech: PartOfSpeech
  sense: string | null
  words: string[]
}

export type SynonymResult = {
  query: string
  // Entry actually shown: may differ from the query (redirect, or inflected form → base form)
  word: string | null
  groups: SynonymGroup[]
  // Wiktionary page the synonyms come from, to credit (CC BY-SA), or null if nothing was found
  sourceUrl: string | null
}
