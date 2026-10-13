import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { findInvitation, newInvitation } from '@/lib/betaInvitations'
import {
  cleanupTestUsers,
  createTestUser,
  getTestPayload,
  TEST_EMAIL_PREFIX,
  TEST_PASSWORD,
} from '../helpers/testUsers'

let payload: Payload
const invitationIds: string[] = []
beforeAll(async () => {
  payload = await getTestPayload()
})
beforeEach(() => vi.stubEnv('NODE_ENV', 'production'))
afterEach(() => vi.unstubAllEnvs())
afterAll(async () => {
  await cleanupTestUsers(payload)
  for (const id of invitationIds) await payload.delete({ collection: 'beta-invitations', id })
})

async function invite(name: string, expiresAt?: string) {
  const invitation = newInvitation(`${TEST_EMAIL_PREFIX}${name}-${Date.now()}@example.test`)
  const doc = await payload.create({
    collection: 'beta-invitations',
    data: { ...invitation.data, ...(expiresAt ? { expiresAt } : {}) },
  })
  invitationIds.push(doc.id)
  return invitation
}

function redeem(
  invitation: ReturnType<typeof newInvitation>,
  email = invitation.data.email,
  password = TEST_PASSWORD,
) {
  return payload.create({
    collection: 'users',
    data: { email, password, role: 'admin', plan: 'pro' },
    context: { betaInviteToken: invitation.token },
    overrideAccess: false,
  })
}

it('consumes a valid invitation, grants no privileges, and refuses reuse even after deleting the account', async () => {
  const invitation = await invite('redeem')
  const user = await redeem(invitation)
  expect(user).toMatchObject({ role: 'user', plan: 'free' })
  expect(await findInvitation(payload, invitation.token)).toBeNull()
  await payload.delete({ collection: 'users', id: user.id })
  await expect(redeem(invitation)).rejects.toThrow()
})

it('refuses another email, an expired invitation, and a missing token', async () => {
  const invitation = await invite('mismatch')
  await expect(redeem(invitation, 'another@example.test')).rejects.toThrow()
  expect(await findInvitation(payload, invitation.token)).not.toBeNull()
  const expired = await invite('expired', new Date(Date.now() - 1000).toISOString())
  await expect(redeem(expired)).rejects.toThrow()
  await expect(
    payload.create({
      collection: 'users',
      data: { email: invitation.data.email, password: TEST_PASSWORD },
      overrideAccess: false,
    }),
  ).rejects.toThrow()
})

it('does not spend the invitation if account validation fails', async () => {
  const invitation = await invite('retry')
  await expect(redeem(invitation, invitation.data.email, 'short')).rejects.toThrow()
  expect(await findInvitation(payload, invitation.token)).not.toBeNull()
  await redeem(invitation)
})

it('allows only one account when the same invitation is redeemed concurrently', async () => {
  const invitation = await invite('concurrent')
  const results = await Promise.allSettled([redeem(invitation), redeem(invitation)])
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(await findInvitation(payload, invitation.token)).toBeNull()
})

it('never exposes invitations to an unauthenticated API reader', async () => {
  await expect(
    payload.find({ collection: 'beta-invitations', overrideAccess: false }),
  ).rejects.toThrow()
})

it('allows only an administrator to create invitations with access checks enabled', async () => {
  const regular = await createTestUser(payload, 'invite-regular')
  const admin = await createTestUser(payload, 'invite-admin', 'admin')
  const invitation = newInvitation(`${TEST_EMAIL_PREFIX}invite-target-${Date.now()}@example.test`)
  for (const user of [undefined, regular]) {
    await expect(
      payload.create({
        collection: 'beta-invitations',
        data: invitation.data,
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  }
  const created = await payload.create({
    collection: 'beta-invitations',
    data: invitation.data,
    user: admin,
    overrideAccess: false,
  })
  invitationIds.push(created.id)
  expect(created.email).toBe(invitation.data.email)
})
