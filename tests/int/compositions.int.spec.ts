import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Composition, User } from '@/payload-types'
import type { Id } from '@/lib/ids'

import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

let payload: Payload
let alice: User
let bob: User

// Act on behalf of a user, like the server actions do (access rules enforced)
const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

const createFor = (user: User, data: Partial<Composition> = {}) =>
  payload.create({
    collection: 'compositions',
    data: {
      title: 'Eurydice',
      owner: user.id,
      page: { format: 'A4', orientation: 'portrait' },
      ...data,
    },
    ...as(user),
  })

const validationMessages = (error: unknown) =>
  (error as { data?: { errors?: { message: string }[] } }).data?.errors?.map((e) => e.message) ?? []

describe('compositions collection', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupTestUsers(payload)
    alice = await createTestUser(payload, 'alice')
    bob = await createTestUser(payload, 'bob')
  })

  afterAll(async () => {
    await cleanupTestUsers(payload)
  })

  describe('ownership and access', () => {
    it('forces the creator as owner, even if another one is sent', async () => {
      const composition = await createFor(alice, { owner: bob.id })
      expect(composition.owner).toBe(alice.id)
    })

    it('applies the default page settings', async () => {
      const composition = await createFor(alice)
      expect(composition.page.margins).toEqual({ top: 25, right: 25, bottom: 25, left: 25 })
    })

    it('stores a layout fitted together, whoever writes it', async () => {
      const composition = await createFor(alice)
      // Each margin alone is within its bounds, not the two together on an A5 page
      const updated = await payload.update({
        collection: 'compositions',
        id: composition.id,
        data: {
          page: {
            format: 'A5',
            orientation: 'portrait',
            margins: { top: 25, right: 100, bottom: 25, left: 100 },
          },
          typography: { firstLineIndent: 90 },
        },
        overrideAccess: true,
        depth: 0,
      })
      expect(updated.page.margins).toEqual({ top: 25, right: 54, bottom: 25, left: 54 })
      expect(updated.typography?.firstLineIndent).toBe(20)

      // A change of the title alone keeps the layout as it was
      const renamed = await payload.update({
        collection: 'compositions',
        id: composition.id,
        data: { title: 'Orphée' },
        ...as(alice),
      })
      expect(renamed.page).toEqual(updated.page)
      expect(renamed.typography).toEqual(updated.typography)
    })

    it('shows each user only their own compositions', async () => {
      const composition = await createFor(alice)
      const { docs } = await payload.find({ collection: 'compositions', ...as(bob) })
      expect(docs.map((doc) => doc.id)).not.toContain(composition.id)
      await expect(
        payload.findByID({ collection: 'compositions', id: composition.id, ...as(bob) }),
      ).rejects.toThrow()
    })

    it('rejects updates and deletion by another user', async () => {
      const composition = await createFor(alice)
      await expect(
        payload.update({
          collection: 'compositions',
          id: composition.id,
          data: { title: 'x' },
          ...as(bob),
        }),
      ).rejects.toThrow()
      await expect(
        payload.delete({ collection: 'compositions', id: composition.id, ...as(bob) }),
      ).rejects.toThrow()
    })

    it('lets the owner delete their composition', async () => {
      const composition = await createFor(alice)
      await payload.delete({ collection: 'compositions', id: composition.id, ...as(alice) })
      await expect(
        payload.findByID({ collection: 'compositions', id: composition.id, ...as(alice) }),
      ).rejects.toThrow()
    })
  })

  describe('validation', () => {
    it.each([
      ['a title that is not text', { title: 123 }, 'The title must be text'],
      [
        'a title that is too long',
        { title: 'x'.repeat(201) },
        'shorter than the max length of 200',
      ],
    ])('rejects %s', async (_label, data, message) => {
      const composition = await createFor(alice)
      const error = await payload
        .update({
          collection: 'compositions',
          id: composition.id,
          data: data as never,
          ...as(alice),
        })
        .catch((e: unknown) => e)
      expect(validationMessages(error).join(' ')).toContain(message)
    })
  })

  describe('binder', () => {
    const binderOf = (compositionId: Id) =>
      payload.find({
        collection: 'binder-items',
        where: { composition: { equals: compositionId } },
        ...as(alice),
      })

    it('starts with one empty document, titled as the app asks', async () => {
      const composition = await payload.create({
        collection: 'compositions',
        data: { title: 'Chant', owner: alice.id, page: { format: 'A4', orientation: 'portrait' } },
        context: { firstDocumentTitle: 'Document sans titre' },
        ...as(alice),
      })
      const { docs } = await binderOf(composition.id)
      expect(docs).toMatchObject([
        { kind: 'document', title: 'Document sans titre', parent: null, owner: alice.id },
      ])
      expect(docs[0].content ?? null).toBeNull()
    })

    it('goes with its composition when it is deleted', async () => {
      const composition = await createFor(alice)
      await payload.delete({ collection: 'compositions', id: composition.id, ...as(alice) })
      const { totalDocs } = await payload.count({
        collection: 'binder-items',
        where: { composition: { equals: composition.id } },
      })
      expect(totalDocs).toBe(0)
    })
  })
})
