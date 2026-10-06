import type { SynonymResult } from './types'

// Dicollecte lists the best synonyms first and drifts towards other senses: keep the head
export const MORE_PER_GROUP = 12

// Beyond this it is no longer a word or a short phrase: not worth a lookup
export const MAX_QUERY_LENGTH = 60

// No entry found
export const EMPTY_RESULT: Omit<SynonymResult, 'query'> = {
  word: null,
  groups: [],
  more: [],
  sourceUrl: null,
}

/*
 * Curated words a suggestion must share to be kept. One is not enough: noise often goes through
 * a single shared word ("toilettes" and "heureux" both list "content").
 */
export const MIN_SHARED_WITH_CURATED = 2
