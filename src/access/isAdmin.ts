import type { Access, FieldAccess } from 'payload'

import { isAdmin } from '@/lib/users'

// Admins only
export const adminOnly: Access = ({ req: { user } }) => isAdmin(user)

// Field version: admins only may set the field, everyone else's value is dropped
export const adminOnlyField: FieldAccess = ({ req: { user } }) => isAdmin(user)
