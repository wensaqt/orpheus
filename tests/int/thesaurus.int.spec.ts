import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import { lookupSynonyms } from '@front/_features/lexicon/lexicon'

import { cleanupThesaurusEntries, seedThesaurusEntry, TEST_WORD_PREFIX } from '../helpers/thesaurus'
import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

let payload: Payload
let user: User

const word = `${TEST_WORD_PREFIX}vif`
const groups = [{ partOfSpeech: 'adjective' as const, sense: null, words: ['rapide', 'prompt'] }]

describe('thesaurus', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupThesaurusEntries(payload)
    await cleanupTestUsers(payload)
    user = await createTestUser(payload, 'thesaurus')
    await seedThesaurusEntry(payload, word, groups)
  })

  afterAll(async () => {
    await cleanupThesaurusEntries(payload)
    await cleanupTestUsers(payload)
  })

  it('finds the synonyms of a word', async () => {
    await expect(lookupSynonyms({ payload, user }, word)).resolves.toEqual({ word, groups })
  })

  it('falls back to the singular', async () => {
    await expect(lookupSynonyms({ payload, user }, `${word}s`)).resolves.toMatchObject({ word })
  })

  it('returns nothing for an unknown word', async () => {
    await expect(lookupSynonyms({ payload, user }, `${TEST_WORD_PREFIX}inconnu`)).resolves.toEqual({
      word: null,
      groups: [],
    })
  })

  it('is readable by signed-in users only, and writable by no user', async () => {
    const asUser = { user, overrideAccess: false } as const
    await expect(
      payload.find({
        collection: 'thesaurus-entries',
        where: { word: { equals: word } },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'thesaurus-entries',
        data: { word: `${TEST_WORD_PREFIX}x`, lang: 'fr', groups },
        ...asUser,
      }),
    ).rejects.toThrow()
  })

  it('rejects groups that do not match the schema', async () => {
    await expect(
      seedThesaurusEntry(payload, `${TEST_WORD_PREFIX}bad`, [
        { partOfSpeech: 'pronoun', sense: null, words: [42 as unknown as string] },
      ]),
    ).rejects.toThrow()
  })

  it('keeps one entry per word and language', async () => {
    await expect(seedThesaurusEntry(payload, word, groups)).rejects.toThrow()
  })
})
