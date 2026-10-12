import {
  type CollectionBeforeValidateHook,
  type CollectionAfterChangeHook,
  type CollectionBeforeOperationHook,
  ValidationError,
  APIError,
} from 'payload'

import { type PasswordProblem, passwordProblem } from '@/lib/passwords/strength'
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/users'

// Without an email adapter, Payload logs reset messages (including tokens) to stdout.
export const requirePasswordResetDelivery: CollectionBeforeOperationHook = ({
  args,
  operation,
}) => {
  if (operation === 'forgotPassword' && process.env.NODE_ENV === 'production')
    throw new APIError('Password reset delivery is not configured for this beta.', 503)
  return args
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

/** The invitation and account commit together. Unique user emails serialize competing redemptions. */
export const consumeBetaInvitation: CollectionAfterChangeHook = async ({ operation, doc, req }) => {
  const id = req.context.betaInvitationId
  if (operation !== 'create' || typeof id !== 'string') return doc
  await req.payload.update({
    collection: 'beta-invitations',
    id,
    data: { consumedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
  return doc
}
