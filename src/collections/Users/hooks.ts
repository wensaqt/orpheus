import {
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  ValidationError,
} from 'payload'

import { MIN_PASSWORD_LENGTH } from '@/lib/users'

/*
 * The very first account becomes the admin: it is created from the admin panel's "create first
 * user" screen, before anyone could grant the role.
 */
export const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  return totalDocs === 0 ? { ...data, role: 'admin' } : data
}

// Payload does not limit password length: every new password, on sign-up or change, is checked
export const requireLongPassword: CollectionBeforeValidateHook = ({ data }) => {
  const password: unknown = data?.password
  if (typeof password === 'string' && password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError({
      collection: 'users',
      errors: [
        {
          path: 'password',
          message: `The password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        },
      ],
    })
  }
  return data
}
