import {
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  ValidationError,
} from 'payload'
import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Composition, User } from '@/payload-types'
import type { Id } from '@/lib/ids'

import { cleanupTestUsers, createTestUser, getTestPayload } from '../helpers/testUsers'
import { up as migratePortraitPages } from '@/migrations/20261007_120000_portrait_pages'

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
  error instanceof ValidationError ? error.data.errors.map((e) => e.message) : []

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

  it('migrates retired formats and fits the layout without changing document content', async () => {
    const letter = await createFor(alice)
    const a5 = await createFor(alice, { page: { format: 'A5', orientation: 'portrait' } })
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    const transactionID = await req.transactionID
    if (!transactionID || !payload.db.sessions) throw new Error('The migration test requires a transaction')
    const db = payload.db.sessions[transactionID].db as MigrateUpArgs['db']

    try {
      // Reproduce the previous enum schema inside a transaction; the final rollback also
      // restores the schema, so the test cannot convert existing non-test compositions.
      await db.execute(sql`
        ALTER TABLE "compositions" ALTER COLUMN "page_format" DROP DEFAULT;
        ALTER TABLE "compositions" ALTER COLUMN "page_orientation" DROP DEFAULT;
        ALTER TABLE "compositions" ALTER COLUMN "page_format" TYPE text;
        ALTER TABLE "compositions" ALTER COLUMN "page_orientation" TYPE text;
        DROP TYPE "enum_compositions_page_format";
        DROP TYPE "enum_compositions_page_orientation";
        CREATE TYPE "enum_compositions_page_format" AS ENUM ('A4', 'A5', 'Letter');
        CREATE TYPE "enum_compositions_page_orientation" AS ENUM ('portrait', 'landscape');
        ALTER TABLE "compositions" ALTER COLUMN "page_format"
          TYPE "enum_compositions_page_format" USING "page_format"::"enum_compositions_page_format";
        ALTER TABLE "compositions" ALTER COLUMN "page_orientation"
          TYPE "enum_compositions_page_orientation" USING "page_orientation"::"enum_compositions_page_orientation";
      `)
      await db.execute(sql`
        UPDATE "compositions" SET "page_format" = 'Letter', "page_orientation" = 'landscape'
          WHERE "id" = ${letter.id};
      `)
      await db.execute(sql`
        UPDATE "compositions" SET "page_orientation" = 'landscape',
          "page_margins_left" = 70, "page_margins_right" = 70, "typography_first_line_indent" = 50
          WHERE "id" = ${a5.id};
      `)
      const binderBefore = await payload.find({
        collection: 'binder-items',
        where: { composition: { in: [letter.id, a5.id] } },
        depth: 0,
        req,
      })
      await migratePortraitPages({ db, payload, req })

      const convertedLetter = await payload.findByID({
        collection: 'compositions',
        id: letter.id,
        req,
      })
      const convertedA5 = await payload.findByID({ collection: 'compositions', id: a5.id, req })
      expect(convertedLetter.page).toEqual(letter.page)
      expect(convertedA5.page).toEqual({
        format: 'A5',
        orientation: 'portrait',
        margins: { top: 25, bottom: 25, left: 54, right: 54 },
      })
      expect(convertedA5.typography?.firstLineIndent).toBe(20)
      expect(
        (
          await payload.find({
            collection: 'binder-items',
            where: { composition: { in: [letter.id, a5.id] } },
            depth: 0,
            req,
          })
        ).docs,
      ).toEqual(binderBefore.docs)

      // A database already restricted to portrait also accepts the migration.
      await migratePortraitPages({ db, payload, req })
    } finally {
      await killTransaction(req)
    }
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
          // Invalid on purpose: what a client could send
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
