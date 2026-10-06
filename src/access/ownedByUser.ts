import type { Access } from 'payload'

// Each user can only read and change records they own
export const ownedByUser: Access = ({ req: { user } }) =>
  user ? { owner: { equals: user.id } } : false
