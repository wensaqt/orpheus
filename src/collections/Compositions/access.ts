import type { Access } from 'payload'

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

// Each user can only see and edit their own compositions
export const ownCompositions: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}
