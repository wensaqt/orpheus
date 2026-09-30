import type { Payload } from 'payload'

import type { SynonymGroup } from '@/lib/thesaurus/types'

// Test entries use made-up words with this prefix, so they never clash with the real thesaurus
export const TEST_WORD_PREFIX = 'orpheustest'

// Inserted with overrideAccess (the collection is read-only for users, as in the import)
export const seedThesaurusEntry = (payload: Payload, word: string, groups: SynonymGroup[]) =>
  payload.create({ collection: 'thesaurus-entries', data: { word, lang: 'fr', groups } })

export const cleanupThesaurusEntries = (payload: Payload) =>
  payload.delete({ collection: 'thesaurus-entries', where: { word: { like: TEST_WORD_PREFIX } } })
