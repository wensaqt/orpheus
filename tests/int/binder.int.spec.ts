import { type Payload, type RequiredDataFromCollectionSlug, ValidationError } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { BinderItem, Composition, User } from '@/payload-types'

import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

let payload: Payload
let alice: User
let bob: User

// Act on behalf of a user, like the server actions do (access rules enforced)
const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

const content = {
  root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [] }] },
} as BinderItem['content']

const newComposition = (user: User) =>
  payload.create({
    collection: 'compositions',
    data: { title: 'Eurydice', owner: user.id, page: { format: 'A4', orientation: 'portrait' } },
    ...as(user),
  })

// Owner and position are filled in by the collection; the types still ask for them
const add = (
  user: User,
  composition: Composition,
  data: Partial<Pick<BinderItem, 'kind' | 'title' | 'parent' | 'position' | 'content'>> = {},
) =>
  payload.create({
    collection: 'binder-items',
    data: {
      composition: composition.id,
      kind: 'document',
      title: 'Chant',
      ...data,
      // Owner and position are filled in by the collection, which the types cannot know
    } as RequiredDataFromCollectionSlug<'binder-items'>,
    ...as(user),
  })

const itemsOf = async (composition: Composition) =>
  (
    await payload.find({
      collection: 'binder-items',
      where: { composition: { equals: composition.id } },
      sort: 'position',
      pagination: false,
      depth: 0,
    })
  ).docs

describe('binder items', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupTestUsers(payload)
    alice = await createTestUser(payload, 'binder-alice')
    bob = await createTestUser(payload, 'binder-bob')
  })

  afterAll(async () => {
    await cleanupTestUsers(payload)
  })

  describe('ownership and access', () => {
    it('belongs to the composition’s owner, whatever owner is sent', async () => {
      const composition = await newComposition(alice)
      const item = await add(alice, composition, { owner: bob.id } as never)
      expect(item.owner).toBe(alice.id)
    })

    it('cannot be added to someone else’s composition', async () => {
      const composition = await newComposition(alice)
      await expect(add(bob, composition)).rejects.toThrow()
    })

    it('is invisible and untouchable for other users', async () => {
      const composition = await newComposition(alice)
      const item = await add(alice, composition)
      await expect(
        payload.findByID({ collection: 'binder-items', id: item.id, ...as(bob) }),
      ).rejects.toThrow()
      await expect(
        payload.update({
          collection: 'binder-items',
          id: item.id,
          data: { title: 'x' },
          ...as(bob),
        }),
      ).rejects.toThrow()
      await expect(
        payload.delete({ collection: 'binder-items', id: item.id, ...as(bob) }),
      ).rejects.toThrow()
    })

    it('never changes composition or kind after creation', async () => {
      const composition = await newComposition(alice)
      const other = await newComposition(alice)
      const item = await add(alice, composition)
      const updated = await payload.update({
        collection: 'binder-items',
        id: item.id,
        data: { composition: other.id, kind: 'folder' },
        ...as(alice),
      })
      expect(updated).toMatchObject({ composition: composition.id, kind: 'document' })
    })
  })

  describe('tree', () => {
    it('places a new item after its siblings', async () => {
      const composition = await newComposition(alice)
      const folder = await add(alice, composition, { kind: 'folder', title: 'Part I' })
      const first = await add(alice, composition, { parent: folder.id })
      const second = await add(alice, composition, { parent: folder.id })
      // The composition's first document sits at position 0 of the root
      expect(folder.position).toBe(1)
      expect([first.position, second.position]).toEqual([0, 1])
    })

    it('accepts any depth of folders', async () => {
      const composition = await newComposition(alice)
      let parent: BinderItem | null = null
      for (let depth = 0; depth < 6; depth++) {
        parent = await add(alice, composition, { kind: 'folder', parent: parent?.id ?? null })
      }
      const deepest = await add(alice, composition, { parent: parent!.id })
      expect(deepest.parent).toBe(parent!.id)
    })

    it('only nests items in a folder of the same composition', async () => {
      const composition = await newComposition(alice)
      const other = await newComposition(alice)
      const document = await add(alice, composition)
      const foreignFolder = await add(alice, other, { kind: 'folder' })
      await expect(add(alice, composition, { parent: document.id })).rejects.toThrow(
        ValidationError,
      )
      await expect(add(alice, composition, { parent: foreignFolder.id })).rejects.toThrow(
        ValidationError,
      )
    })

    it('refuses to move a folder inside itself or its contents', async () => {
      const composition = await newComposition(alice)
      const outer = await add(alice, composition, { kind: 'folder' })
      const inner = await add(alice, composition, { kind: 'folder', parent: outer.id })
      const move = (id: number, parent: number) =>
        payload.update({ collection: 'binder-items', id, data: { parent }, ...as(alice) })
      await expect(move(outer.id, outer.id)).rejects.toThrow(ValidationError)
      await expect(move(outer.id, inner.id)).rejects.toThrow(ValidationError)
    })

    it('moves an item to the end of its new folder', async () => {
      const composition = await newComposition(alice)
      const folder = await add(alice, composition, { kind: 'folder' })
      await add(alice, composition, { parent: folder.id })
      const loose = await add(alice, composition)
      const moved = await payload.update({
        collection: 'binder-items',
        id: loose.id,
        data: { parent: folder.id },
        ...as(alice),
      })
      expect(moved).toMatchObject({ parent: folder.id, position: 1 })
    })

    it('keeps the positions of a planned move', async () => {
      const composition = await newComposition(alice)
      const folder = await add(alice, composition, { kind: 'folder' })
      const inside = await add(alice, composition, { parent: folder.id })
      const loose = await add(alice, composition)
      // Like moveBinderItem: the loose document goes first in the folder, the other one second
      const update = (id: number, parent: number, position: number) =>
        payload.update({
          collection: 'binder-items',
          id,
          data: { parent, position },
          context: { keepPosition: true },
          ...as(alice),
        })
      await update(loose.id, folder.id, 0)
      await update(inside.id, folder.id, 1)
      const placed = (await itemsOf(composition)).filter((item) => item.parent === folder.id)
      expect(placed.map((item) => [item.id, item.position])).toEqual([
        [loose.id, 0],
        [inside.id, 1],
      ])
    })

    it('deletes everything inside a folder, at any depth, and nothing else', async () => {
      const composition = await newComposition(alice)
      const outer = await add(alice, composition, { kind: 'folder' })
      const inner = await add(alice, composition, { kind: 'folder', parent: outer.id })
      await add(alice, composition, { parent: inner.id })
      await add(alice, composition, { parent: outer.id })
      const before = await itemsOf(composition)
      await payload.delete({ collection: 'binder-items', id: outer.id, ...as(alice) })
      const after = await itemsOf(composition)
      expect(before).toHaveLength(5)
      // Only the composition's first document is left
      expect(after.map((item) => item.kind)).toEqual(['document'])
    })
  })

  describe('content', () => {
    it('stores a valid Lexical state in a document', async () => {
      const composition = await newComposition(alice)
      const item = await add(alice, composition, { content })
      expect(item.content).toEqual(content)
    })

    it('rejects content that is not a Lexical state', async () => {
      const composition = await newComposition(alice)
      await expect(add(alice, composition, { content: { foo: 1 } as never })).rejects.toThrow(
        ValidationError,
      )
    })

    it('refuses content in a folder', async () => {
      const composition = await newComposition(alice)
      await expect(add(alice, composition, { kind: 'folder', content })).rejects.toThrow(
        ValidationError,
      )
    })
  })
})
