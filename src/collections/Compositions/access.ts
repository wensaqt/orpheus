import type { Access } from 'payload'

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

// Chaque utilisateur ne voit et ne modifie que ses propres compositions
export const ownCompositions: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}
