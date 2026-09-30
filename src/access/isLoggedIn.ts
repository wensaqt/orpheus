import type { Access } from 'payload'

// Any signed-in user
export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)
