import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/isAdmin'

/** Admins can revoke an invitation by deleting it; raw tokens are never persisted. */
export const BetaInvitations: CollectionConfig = {
  slug: 'beta-invitations',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'expiresAt', 'consumedAt'] },
  access: { create: adminOnly, read: adminOnly, update: () => false, delete: adminOnly },
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'tokenHash', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'consumedAt', type: 'date', admin: { readOnly: true } },
  ],
}
