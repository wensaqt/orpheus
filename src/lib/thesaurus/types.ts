// Shared by the thesaurus collection, its import script and the frontend

export const THESAURUS_LANGS = ['fr'] as const
export type ThesaurusLang = (typeof THESAURUS_LANGS)[number]

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

export type ThesaurusEntry = {
  word: string
  groups: SynonymGroup[]
}
