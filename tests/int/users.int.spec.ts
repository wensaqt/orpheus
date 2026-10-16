import { type Payload, ValidationError } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import {
  cleanupTestUsers,
  createTestUser,
  getTestPayload,
  TEST_EMAIL_PREFIX,
  TEST_PASSWORD,
} from '../helpers/testUsers'

let payload: Payload
let user: User
let other: User
let admin: User

describe('users', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
    await cleanupTestUsers(payload)
    user = await createTestUser(payload, 'users')
    other = await createTestUser(payload, 'users-other')
    admin = await createTestUser(payload, 'users-admin', 'admin')
  })

  afterAll(async () => {
    await cleanupTestUsers(payload)
  })

  it('starts as a free, regular account', () => {
    expect(user).toMatchObject({ role: 'user', plan: 'free' })
  })

  it('recognizes a cookie on navigation and same-origin POSTs, but rejects another origin', async () => {
    const { token } = await payload.login({
      collection: 'users',
      data: { email: user.email, password: TEST_PASSWORD },
    })
    const headers = new Headers({
      cookie: `${payload.config.cookiePrefix}-token=${token}`,
      'sec-fetch-site': 'same-origin',
    })
    expect((await payload.auth({ headers })).user?.id).toBe(user.id)
    headers.set('origin', payload.config.serverURL)
    expect((await payload.auth({ headers })).user?.id).toBe(user.id)
    headers.set('origin', 'https://untrusted.example')
    expect((await payload.auth({ headers })).user).toBeNull()
  })

  it('cannot grant itself a role or a plan', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: user.id,
      data: { role: 'admin', plan: 'pro' },
      user,
      overrideAccess: false,
    })
    expect(updated).toMatchObject({ role: 'user', plan: 'free' })
  })

  it('sees only its own account, while an admin sees every account', async () => {
    const ids = async (as: User) =>
      (
        await payload.find({
          collection: 'users',
          where: { id: { in: [user.id, other.id] } },
          user: as,
          overrideAccess: false,
        })
      ).docs.map((doc) => doc.id)
    expect(await ids(user)).toEqual([user.id])
    expect((await ids(admin)).sort()).toEqual([user.id, other.id].sort())
  })

  it('cannot change or delete another account', async () => {
    const asUser = { user, overrideAccess: false } as const
    await expect(
      payload.update({
        collection: 'users',
        id: other.id,
        data: { email: 'x@example.test' },
        ...asUser,
      }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'users', id: other.id, ...asUser })).rejects.toThrow()
  })

  it('lets an admin grant Pro', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: other.id,
      data: { plan: 'pro' },
      user: admin,
      overrideAccess: false,
    })
    expect(updated.plan).toBe('pro')
  })

  it('lets a visitor sign up, as a regular free account whatever they send', async () => {
    const created = await payload.create({
      collection: 'users',
      data: {
        email: `${TEST_EMAIL_PREFIX}Signup-${Date.now()}@Example.test`,
        password: TEST_PASSWORD,
        role: 'admin',
        plan: 'pro',
      },
      overrideAccess: false,
    })
    expect(created).toMatchObject({ role: 'user', plan: 'free' })
    // The sign-up form checks for a taken email in lower case
    expect(created.email).toBe(created.email.toLowerCase())
  })

  it('refuses a short password, on sign-up as on change', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: `${TEST_EMAIL_PREFIX}short-${Date.now()}@example.test`, password: 'lyre' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(ValidationError)
    await expect(
      payload.update({
        collection: 'users',
        id: user.id,
        data: { password: 'lyre' },
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('refuses a common or predictable password, whoever sets it', async () => {
    for (const password of ['azertyuiop123', 'abababababab']) {
      await expect(
        payload.update({ collection: 'users', id: user.id, data: { password } }),
      ).rejects.toThrow(ValidationError)
    }
  })

  it('refuses an oversized password or email', async () => {
    const signUp = (email: string, password: string) =>
      payload.create({ collection: 'users', data: { email, password }, overrideAccess: false })
    await expect(
      signUp(`${TEST_EMAIL_PREFIX}long-${Date.now()}@example.test`, 'a'.repeat(129)),
    ).rejects.toThrow(ValidationError)
    await expect(
      signUp(`${TEST_EMAIL_PREFIX}${'a'.repeat(250)}@example.test`, TEST_PASSWORD),
    ).rejects.toThrow(ValidationError)
  })

  it('opens the admin panel to admins only', async () => {
    // The collection defines admin access (optional in Payload's type); a request needs no more
    const canAccessAdmin = (as: User) =>
      payload.collections.users.config.access.admin!({ req: { user: as, payload } as never })
    expect(await canAccessAdmin(admin)).toBe(true)
    expect(await canAccessAdmin(user)).toBe(false)
  })
})
