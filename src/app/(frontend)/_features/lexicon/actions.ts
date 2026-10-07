'use server'

import { authedAction } from '@front/_lib/server/auth'

import { EMPTY_RESULT } from './constants'
import { lookupSynonyms } from './lexicon'
import { parseQuery } from './query'
import type { SynonymResult } from './types'

// Synonyms of a word, for signed-in users; the raw query comes from the client
export const findSynonyms = authedAction(
  async (session, rawQuery: string): Promise<SynonymResult> => {
    const query = parseQuery(rawQuery)
    if (!query) return { query: '', ...EMPTY_RESULT }
    return { query, ...(await lookupSynonyms(session, query)) }
  },
)
