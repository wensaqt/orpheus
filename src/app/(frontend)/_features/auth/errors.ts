import { AuthenticationError, LockedAuth, ValidationError } from 'payload'

import type { LogInError, SignUpError } from './types'

/*
 * Reason shown for a failed sign-in. Unknown or wrong credentials give the same answer, so the
 * form does not reveal which emails have an account.
 */
export function toLogInError(error: unknown): LogInError {
  if (error instanceof LockedAuth) return 'locked'
  if (error instanceof AuthenticationError) return 'invalid'
  return 'unknown'
}

/*
 * Reason shown for a failed sign-up, from the collection's validation. A taken email is checked
 * before creating the account, so an email error here means a malformed address.
 */
export function toSignUpError(error: unknown): SignUpError {
  if (!(error instanceof ValidationError)) return 'unknown'
  const paths = error.data.errors.map((fieldError) => fieldError.path)
  if (paths.includes('password')) return 'weak'
  if (paths.includes('email')) return 'invalidEmail'
  return 'unknown'
}
