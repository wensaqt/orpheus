'use server'

import { authedAction } from '@front/_lib/server/auth'

import { lookupRelated, PAGE_URL } from './lexicon'
import { normalizeWord } from './normalize'
import { type LexiconResult, type Relation, RELATIONS } from './types'

// Beyond this, it is no longer a word or phrase: no point querying Wiktionary
const MAX_QUERY_LENGTH = 60

// Synonyms or antonyms of a word, for signed-in users
export const findRelatedWords = authedAction(
  async (_session, query: string, relation: Relation): Promise<LexiconResult> => {
    // relation comes from the client: only known values are accepted
    if (!RELATIONS.includes(relation)) throw new Error('Unknown relation')

    const normalized = normalizeWord(String(query)).slice(0, MAX_QUERY_LENGTH)
    if (!normalized) return { relation, query: normalized, word: null, groups: [], sourceUrl: null }

    const { word, groups } = await lookupRelated(normalized, relation)
    return {
      relation,
      query: normalized,
      word,
      groups,
      sourceUrl: word ? `${PAGE_URL}${encodeURIComponent(word.replace(/ /g, '_'))}` : null,
    }
  },
)
