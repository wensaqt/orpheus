// Shared by the thesaurus collection, its import script and the frontend

export const THESAURUS_LANGS = ['fr'] as const
export type ThesaurusLang = (typeof THESAURUS_LANGS)[number]

// Wiktionary: curated, grouped by sense, sometimes sparse. Dicollecte: rich but noisy.
export const THESAURUS_SOURCES = ['wiktionary', 'dicollecte'] as const
export type ThesaurusSource = (typeof THESAURUS_SOURCES)[number]

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
  // Base form of an inflected form ("marchait" → "marcher"), whose synonyms apply
  lemma?: string | null
  // Part of speech of that inflected form, whose synonyms are listed first
  lemmaPartOfSpeech?: PartOfSpeech | null
}
