import {
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  ValidationError,
} from 'payload'

import { type PasswordProblem, passwordProblem } from '@/lib/passwords/strength'
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

const PASSWORD_PROBLEM_MESSAGES: Record<PasswordProblem, string> = {
  tooShort: `The password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
  tooLong: `The password must be at most ${MAX_PASSWORD_LENGTH} characters long.`,
  common: 'This password is among the most used ones.',
  personal: 'The password must not contain the email or the app name.',
  predictable: 'The password is made of repeated or consecutive characters.',
}

/*
 * Payload checks neither the email length nor the password: every email and new password, on
 * sign-up or change and whoever sets it, goes through the app's rules.
 */
export const checkCredentials: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const email: unknown = data?.email ?? originalDoc?.email
  const password: unknown = data?.password
  const errors: { path: string; message: string }[] = []
  if (typeof email === 'string' && email.length > MAX_EMAIL_LENGTH) {
    errors.push({
      path: 'email',
      message: `The email must be at most ${MAX_EMAIL_LENGTH} characters long.`,
    })
  }
  if (typeof password === 'string') {
    const problem = passwordProblem(password, { email: typeof email === 'string' ? email : null })
    if (problem) errors.push({ path: 'password', message: PASSWORD_PROBLEM_MESSAGES[problem] })
  }
  if (errors.length) throw new ValidationError({ collection: 'users', errors })
  return data
}
