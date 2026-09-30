import type { Access } from 'payload'

// Each user can only see and edit their own compositions
export const ownCompositions: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}
