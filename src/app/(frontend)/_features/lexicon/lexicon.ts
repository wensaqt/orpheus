import 'server-only'

import type { Session } from '@front/_lib/server/auth'

import { lookupCandidates } from './query'
import type { SynonymResult } from './types'

const LANG = 'fr'

// Synonyms of a normalised word, from the thesaurus collection (one query for all candidates)
export async function lookupSynonyms(
  { payload, user }: Session,
  word: string,
): Promise<Omit<SynonymResult, 'query'>> {
  const candidates = lookupCandidates(word)
  const { docs } = await payload.find({
    collection: 'thesaurus-entries',
    where: { lang: { equals: LANG }, word: { in: candidates } },
    select: { word: true, groups: true },
    pagination: false,
    depth: 0,
    user,
    overrideAccess: false,
  })

  // The first candidate that exists wins: the word itself before its singular
  const entry = candidates
    .map((candidate) => docs.find((doc) => doc.word === candidate))
    .find(Boolean)
  return entry ? { word: entry.word, groups: entry.groups } : { word: null, groups: [] }
}
