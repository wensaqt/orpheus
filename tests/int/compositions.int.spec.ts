import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Composition, User } from '@/payload-types'

import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

let payload: Payload
let alice: User
let bob: User

const content = {
  root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [] }] },
} as Composition['content']

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
      ['content without a Lexical root', { content: { foo: 1 } }, "required property 'root'"],
      ['a root of the wrong type', { content: { root: { type: 'x', children: [] } } }, 'constant'],
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

    it('accepts a valid Lexical state', async () => {
      const composition = await createFor(alice)
      const updated = await payload.update({
        collection: 'compositions',
        id: composition.id,
        data: { content },
        ...as(alice),
      })
      expect(updated.content).toEqual(content)
    })
  })

  describe('partial save (like saveComposition)', () => {
    it('an undefined key leaves the matching field unchanged', async () => {
      const composition = await createFor(alice, { content })
      const read = () =>
        payload.findByID({ collection: 'compositions', id: composition.id, ...as(alice) })

      await payload.update({
        collection: 'compositions',
        id: composition.id,
        data: { title: 'Title only', content: undefined },
        ...as(alice),
      })
      expect(await read()).toMatchObject({ title: 'Title only', content })

      await payload.update({
        collection: 'compositions',
        id: composition.id,
        data: { title: undefined, content },
        ...as(alice),
      })
      expect((await read()).title).toBe('Title only')
    })
  })
})
