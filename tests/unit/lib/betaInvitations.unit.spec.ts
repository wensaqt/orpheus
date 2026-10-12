import { expect, it, vi } from 'vitest'
import {
  findInvitation,
  invitationHash,
  INVITATION_LIFETIME_MS,
  newInvitation,
} from '@/lib/betaInvitations'
import type { Payload } from 'payload'

it('issues distinct opaque tokens, stores only their hash, and binds them to normalized email for seven days', () => {
  const now = Date.now()
  const first = newInvitation(' TEST@Example.test ', now)
  const second = newInvitation('test@example.test', now)
  expect(first.token).toMatch(/^[a-f0-9]{64}$/)
  expect(first.token).not.toBe(second.token)
  expect(first.data.email).toBe('test@example.test')
  expect(first.data.tokenHash).toBe(invitationHash(first.token))
  expect(first.data.tokenHash).not.toBe(first.token)
  expect(Date.parse(first.data.expiresAt) - now).toBe(INVITATION_LIFETIME_MS)
})

it.each([undefined, '', 'bad-token', 'a'.repeat(65), ['a'.repeat(64)]])(
  'rejects malformed tokens without touching the database',
  async (token) => {
    const find = vi.fn()
    await expect(findInvitation({ find } as unknown as Payload, token)).resolves.toBeNull()
    expect(find).not.toHaveBeenCalled()
  },
)
