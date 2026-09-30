import type { ThesaurusSource } from './types'

// Where the synonym data comes from, to credit it
export const THESAURUS_CREDITS: Record<
  ThesaurusSource,
  { name: string; url: string; license: string }
> = {
  wiktionary: { name: 'Wiktionnaire', url: 'https://fr.wiktionary.org/', license: 'CC BY-SA' },
  dicollecte: { name: 'Dicollecte', url: 'https://grammalecte.net/', license: 'LGPL' },
}

// Page of a word on the French Wiktionary (CC BY-SA content is credited per page)
export const wiktionaryPageUrl = (word: string) =>
  `https://fr.wiktionary.org/wiki/${encodeURIComponent(word.replace(/ /g, '_'))}`
