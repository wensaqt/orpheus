import { createHash, randomBytes } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'

export const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_PATTERN = /^[a-f0-9]{64}$/

export function invitationHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Only the hash is stored; the raw secret is returned once to the trusted issuer. */
export function newInvitation(email: string, now = Date.now()) {
  const token = randomBytes(32).toString('hex')
  return {
    token,
    data: {
      email: email.trim().toLowerCase(),
      tokenHash: invitationHash(token),
      expiresAt: new Date(now + INVITATION_LIFETIME_MS).toISOString(),
    },
  }
}

export async function findInvitation(payload: Payload, token: unknown, req?: PayloadRequest) {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null
  const { docs } = await payload.find({
    collection: 'beta-invitations',
    where: {
      and: [
        { tokenHash: { equals: invitationHash(token) } },
        { expiresAt: { greater_than: new Date().toISOString() } },
        { consumedAt: { exists: false } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}
