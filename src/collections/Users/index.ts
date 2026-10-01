import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField } from '@/access/isAdmin'
import { DEFAULT_PLAN, DEFAULT_USER_ROLE, isAdmin, PLANS, USER_ROLES } from '@/lib/users'

import { adminOrSelf } from './access'
import { checkCredentials, firstUserIsAdmin } from './hooks'

// Role and plan can only be granted by an admin, never by the account itself
const restricted = { create: adminOnlyField, update: adminOnlyField }

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'plan'],
  },
  auth: true,
  access: {
    // The admin panel is for admins; everyone else signs in on the app's own /login page
    admin: ({ req: { user } }) => isAdmin(user),
    // Anyone can sign up; the role and plan fields stay at their defaults unless an admin sets them
    create: () => true,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: adminOnly,
    unlock: adminOnly,
  },
  hooks: {
    beforeValidate: [checkCredentials],
    beforeChange: [firstUserIsAdmin],
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
