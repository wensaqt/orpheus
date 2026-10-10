import { type Payload, type RequiredDataFromCollectionSlug, ValidationError } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SAMPLE_SCORE } from '@/lib/scores/sample'
import type { User } from '@/payload-types'

import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

let payload: Payload
let owner: User
let stranger: User

describe('score documents in a composition', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupTestUsers(payload)
    owner = await createTestUser(payload, 'score-owner')
    stranger = await createTestUser(payload, 'score-stranger')
  })

  afterAll(async () => {
    await cleanupTestUsers(payload)
  })

  it('stores MusicXML beside text documents and enforces their distinct bodies', async () => {
    const composition = await payload.create({
      collection: 'compositions',
      data: {
        title: 'Partition',
        owner: owner.id,
        page: { format: 'A4', orientation: 'portrait' },
      },
      user: owner,
      overrideAccess: false,
    })
    const score = await payload.create({
      collection: 'binder-items',
      data: {
        composition: composition.id,
        kind: 'document',
        documentType: 'score',
        title: 'Mélodie',
        scoreXml: SAMPLE_SCORE,
      } as RequiredDataFromCollectionSlug<'binder-items'>,
      user: owner,
      overrideAccess: false,
    })
    expect(score.documentType).toBe('score')
    expect(score.scoreXml).toBe(SAMPLE_SCORE)
    expect(score.content).toBeNull()

    await expect(
      payload.update({
        collection: 'binder-items',
        id: score.id,
        data: { scoreXml: '<score-partwise><broken>' },
        user: owner,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect((await payload.findByID({ collection: 'binder-items', id: score.id })).scoreXml).toBe(
      SAMPLE_SCORE,
    )

    await expect(
      payload.update({
        collection: 'binder-items',
        id: score.id,
        data: { content: { root: { type: 'root', version: 1, children: [] } } },
        user: owner,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)

    await expect(
      payload.findByID({
        collection: 'binder-items',
        id: score.id,
        user: stranger,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
