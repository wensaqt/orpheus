import type { Payload, RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Composition, User } from '@/payload-types'

import { uuid } from '../helpers/ids'
import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'

/*
 * The GET route that feeds the editor's client cache, run for real against Payload and the
 * database: only the session (normally read from the request's cookie) is faked.
 */
const session = vi.hoisted((): { current: Record<string, unknown> } => ({
  current: { payload: null, user: null },
}))
vi.mock('@front/_lib/server/auth', () => ({ getSession: async () => session.current }))

const { GET } = await import('@front/compositions/[id]/[documentId]/content/route')

let payload: Payload
let alice: User
let bob: User

const request = (id: string, documentId: string) =>
  GET(new Request('http://localhost/'), { params: Promise.resolve({ id, documentId }) })

const asUser = (user: User | null) => {
  session.current = { payload, user }
}

const compositionWithDocument = async (user: User) => {
  const composition: Composition = await payload.create({
    collection: 'compositions',
    data: { title: 'Eurydice', owner: user.id, page: { format: 'A4', orientation: 'portrait' } },
    user,
    overrideAccess: false,
  })
  const { docs } = await payload.find({
    collection: 'binder-items',
    where: { composition: { equals: composition.id } },
    depth: 0,
  })
  const [document] = docs
  expect(document).toBeDefined()
  return { composition, document }
}

describe('document content route', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupTestUsers(payload)
    alice = await createTestUser(payload, 'content-alice')
    bob = await createTestUser(payload, 'content-bob')
  })
  beforeEach(() => asUser(alice))
  afterAll(async () => {
    await cleanupTestUsers(payload)
  })

  it('returns the user’s document with its version, never to be cached', async () => {
    const { composition, document } = await compositionWithDocument(alice)
    const response = await request(composition.id, document.id)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      id: document.id,
      title: document.title,
      content: null,
      updatedAt: document.updatedAt,
    })
  })

  it('answers 404 for a folder, another composition’s document or someone else’s', async () => {
    const { composition, document } = await compositionWithDocument(alice)
    const other = await compositionWithDocument(alice)
    const folder = await payload.create({
      collection: 'binder-items',
      data: {
        composition: composition.id,
        kind: 'folder',
        title: 'Notes',
      } as RequiredDataFromCollectionSlug<'binder-items'>,
      user: alice,
      overrideAccess: false,
    })
    expect((await request(composition.id, folder.id)).status).toBe(404)
    expect((await request(composition.id, other.document.id)).status).toBe(404)
    asUser(bob)
    expect((await request(composition.id, document.id)).status).toBe(404)
  })

  it('answers 404 for malformed ids, without asking the database', async () => {
    const find = vi.spyOn(payload, 'findByID')
    for (const [id, documentId] of [
      ['abc', uuid(1)],
      [uuid(1), '12'],
      [uuid(1), ''],
    ]) {
      expect((await request(id, documentId)).status).toBe(404)
    }
    expect(find).not.toHaveBeenCalled()
    find.mockRestore()
  })

  it('answers 401 without a session', async () => {
    const { composition, document } = await compositionWithDocument(alice)
    asUser(null)
    expect((await request(composition.id, document.id)).status).toBe(401)
  })
})
