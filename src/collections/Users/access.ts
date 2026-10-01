import type { Access } from 'payload'

import { isAdmin } from '@/lib/users'

// Admins see every account, everyone else only their own
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } }
}
