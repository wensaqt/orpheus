import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Composition, User } from '@/payload-types'

import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

/*
 * The binder's server actions, run for real against Payload and the database, as a given
 * user: only the session (normally read from the request's cookie) and the language are faked.
 */
const session = vi.hoisted(() => ({ current: null as { payload: Payload; user: User } | null }))
vi.mock('@front/_lib/server/auth', () => ({
  authedAction:
    <Args extends unknown[], Result>(handler: (s: unknown, ...args: Args) => Promise<Result>) =>
    (...args: Args) =>
      handler(session.current, ...args),
}))
vi.mock('@front/_lib/server/i18n', async () => {
  const { createT } = await import('@front/_lib/i18n')
  return { getT: async () => createT('en') }
})

const actions = await import('@front/_features/binder/actions')

let payload: Payload
let alice: User
let bob: User

const asUser = (user: User) => {
  session.current = { payload, user }
}

const newComposition = (user: User): Promise<Composition> =>
  payload.create({
    collection: 'compositions',
    data: { title: 'Eurydice', owner: user.id, page: { format: 'A4', orientation: 'portrait' } },
    user,
    overrideAccess: false,
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

describe('binder actions', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupTestUsers(payload)
    alice = await createTestUser(payload, 'actions-alice')
    bob = await createTestUser(payload, 'actions-bob')
  })
  beforeEach(() => asUser(alice))
  afterAll(async () => {
    await cleanupTestUsers(payload)
  })

  it('creates an item titled in the user’s language, last in its folder', async () => {
    const composition = await newComposition(alice)
    const result = await actions.createBinderItem(composition.id, 'folder', null)
    expect(result).toMatchObject({
      status: 'done',
      data: { kind: 'folder', title: 'New folder', parent: null, position: 1 },
    })
    if (result.status === 'done') expect(typeof result.data.updatedAt).toBe('string')
  })

  it('refuses malformed input before touching the database', async () => {
    const composition = await newComposition(alice)
    const [first] = await itemsOf(composition)
    for (const result of await Promise.all([
      actions.createBinderItem(composition.id, 'chapter' as never, null),
      actions.createBinderItem(composition.id, 'document', 'root' as never),
      actions.renameBinderItem(first.id, '   '),
      actions.moveBinderItem(first.id, { parent: null, index: Number.NaN }),
      actions.moveBinderItem(first.id, { parent: null, index: -1 }),
      actions.moveBinderItem(first.id, 'up' as never),
      actions.deleteBinderItem('1' as never),
    ])) {
      expect(result).toEqual({ status: 'error' })
    }
    expect(await itemsOf(composition)).toHaveLength(1)
  })

  it('trims titles', async () => {
    const composition = await newComposition(alice)
    const [first] = await itemsOf(composition)
    expect(await actions.renameBinderItem(first.id, '  Chant I  ')).toEqual({
      status: 'done',
      data: undefined,
    })
    expect((await itemsOf(composition))[0].title).toBe('Chant I')
  })

  it('cannot touch someone else’s binder', async () => {
    const composition = await newComposition(alice)
    const [first] = await itemsOf(composition)
    asUser(bob)
    for (const result of await Promise.all([
      actions.createBinderItem(composition.id, 'document', null),
      actions.renameBinderItem(first.id, 'Stolen'),
      actions.saveDocument(first.id, { root: { type: 'root', children: [] } }),
      actions.moveBinderItem(first.id, { parent: null, index: 0 }),
      actions.deleteBinderItem(first.id),
      actions.loadBinderEntries(composition.id),
    ])) {
      // Reading someone else's binder finds nothing rather than failing
      if (result.status === 'done') expect(result.data).toEqual([])
      else expect(result).toEqual({ status: 'error' })
    }
    const [unchanged] = await itemsOf(composition)
    expect(unchanged.title).toBe(first.title)
  })

  it('moves an item in one transaction, renumbering its siblings', async () => {
    const composition = await newComposition(alice)
    const folder = await actions.createBinderItem(composition.id, 'folder', null)
    const loose = await actions.createBinderItem(composition.id, 'document', null)
    if (folder.status !== 'done' || loose.status !== 'done') throw new Error('setup')

    expect(
      await actions.moveBinderItem(loose.data.id, { parent: folder.data.id, index: 0 }),
    ).toEqual({ status: 'done', data: undefined })
    const placed = Object.fromEntries(
      (await itemsOf(composition)).map((item) => [item.id, [item.parent, item.position]]),
    )
    expect(placed[loose.data.id]).toEqual([folder.data.id, 0])
    // The root closes the gap: the first document, then the folder
    expect(placed[folder.data.id]).toEqual([null, 1])
  })

  it('refuses to move a folder into itself, leaving everything in place', async () => {
    const composition = await newComposition(alice)
    const folder = await actions.createBinderItem(composition.id, 'folder', null)
    if (folder.status !== 'done') throw new Error('setup')
    const before = await itemsOf(composition)
    expect(
      await actions.moveBinderItem(folder.data.id, { parent: folder.data.id, index: 0 }),
    ).toEqual({ status: 'error' })
    expect(await itemsOf(composition)).toEqual(before)
  })

  it('saves a document and returns its version stamp', async () => {
    const composition = await newComposition(alice)
    const [first] = await itemsOf(composition)
    const result = await actions.saveDocument(first.id, {
      root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [] }] },
    })
    expect(result.status).toBe('done')
    if (result.status === 'done') expect(typeof result.data.updatedAt).toBe('string')
  })
})
