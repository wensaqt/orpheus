import {
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  ValidationError,
} from 'payload'

import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/users'

/*
 * The very first account becomes the admin: it is created from the admin panel's "create first
 * user" screen, before anyone could grant the role.
 */
export const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  return totalDocs === 0 ? { ...data, role: 'admin' } : data
}

// Payload limits neither: every email and new password, on sign-up or change, is checked
export const checkCredentialLengths: CollectionBeforeValidateHook = ({ data }) => {
  const email: unknown = data?.email
  const password: unknown = data?.password
  const errors: { path: string; message: string }[] = []
  if (typeof email === 'string' && email.length > MAX_EMAIL_LENGTH) {
    errors.push({
      path: 'email',
      message: `The email must be at most ${MAX_EMAIL_LENGTH} characters long.`,
    })
  }
  if (
    typeof password === 'string' &&
    (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)
  ) {
    errors.push({
      path: 'password',
      message: `The password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters long.`,
    })
  }
  if (errors.length) throw new ValidationError({ collection: 'users', errors })
  return data
}
