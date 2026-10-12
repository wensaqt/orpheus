import type { Access } from 'payload'

import { isAdmin } from '@/lib/users'
import { findInvitation } from '@/lib/betaInvitations'

export const canCreateUser: Access = async ({ req, data }) => {
  if (isAdmin(req.user) || process.env.NODE_ENV !== 'production') return true
  const invite = await findInvitation(
    req.payload,
    req.context.betaInviteToken ?? req.headers.get('x-beta-invite'),
    req,
  )
  if (
    !invite ||
    typeof data?.email !== 'string' ||
    invite.email !== data.email.trim().toLowerCase()
  )
    return false
  req.context.betaInvitationId = invite.id
  return true
}

// Admins see every account, everyone else only their own
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } }
}
