import type { Access } from 'payload'

import { isAdmin } from '@/lib/users'
import { canRegisterEmail, verifyBetaInvite } from '@/lib/deployment'

export const canCreateUser: Access = ({ req, data }) =>
  isAdmin(req.user) ||
  (canRegisterEmail(data?.email) &&
    verifyBetaInvite(req.context.betaInviteCode ?? req.headers.get('x-beta-invite')))

// Admins see every account, everyone else only their own
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } }
}
