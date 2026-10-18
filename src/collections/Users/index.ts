import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField } from '@/access/isAdmin'
import { DEFAULT_PLAN, DEFAULT_USER_ROLE, isAdmin, PLANS, USER_ROLES } from '@/lib/users'

import { adminOrSelf, canCreateUser } from './access'
import { checkCredentials, requirePasswordResetDelivery, consumeBetaInvitation } from './hooks'

// Role and plan can only be granted by an admin, never by the account itself
const restricted = { create: adminOnlyField, update: adminOnlyField }

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'plan'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  access: {
    // The admin panel is for admins; everyone else signs in on the app's own /login page
    admin: ({ req: { user } }) => isAdmin(user),
    // Production beta registration requires an individual invitation; public creation never grants admin.
    create: canCreateUser,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: adminOnly,
    unlock: adminOnly,
  },
  // Payload's first-user endpoint bypasses access checks, even on a production database.
  // Administrators are bootstrapped through the trusted Local API instead.
  endpoints:
    process.env.NODE_ENV === 'production'
      ? [
          {
            path: '/register-first-user',
            method: 'post',
            handler: () => Response.json({ message: 'Forbidden' }, { status: 403 }),
          },
        ]
      : [],
  hooks: {
    beforeOperation: [requirePasswordResetDelivery],
    beforeValidate: [checkCredentials],
    afterChange: [consumeBetaInvitation],
  },
  fields: [
    // Email added by default
    {
      name: 'role',
      type: 'select',
      options: [...USER_ROLES],
      // Not required: the default fills it on create, and an empty value means no privilege
      defaultValue: DEFAULT_USER_ROLE,
      access: restricted,
      admin: { position: 'sidebar' },
    },
    {
      name: 'plan',
      type: 'select',
      options: [...PLANS],
      defaultValue: DEFAULT_PLAN,
      access: restricted,
      admin: { position: 'sidebar' },
    },
  ],
}
