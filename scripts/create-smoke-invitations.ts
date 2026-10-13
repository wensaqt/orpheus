import { getPayload } from 'payload'
import config from '@payload-config'
import { invitationHash, INVITATION_LIFETIME_MS } from '@/lib/betaInvitations'

// Predictable tokens are confined to a disposable local database used by production smoke tests.
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(database.hostname))
  throw new Error('Smoke invitations require a disposable localhost database.')
const payload = await getPayload({ config })
try {
  // The public first-user bootstrap must be tested with no existing account.
  const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
  if (totalDocs) throw new Error('Production invitation smoke checks require no existing users.')
  for (const [email, token] of [
    ['beta-first@example.test', 'a'.repeat(64)],
    ['beta-other@example.test', 'b'.repeat(64)],
  ]) {
    await payload.create({
      collection: 'beta-invitations',
      overrideAccess: true,
      data: {
        email,
        tokenHash: invitationHash(token),
        expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
      },
    })
  }
} finally {
  await payload.destroy()
}
