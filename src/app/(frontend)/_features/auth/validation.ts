import { passwordProblem } from '@/lib/passwords/strength'
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from '@/lib/users'

import type { SignUpError } from './types'

type Credentials = { email: string; password: string }

// Beyond what any account can have: refused before Payload looks anything up or hashes anything
export const exceedsCredentialLimits = ({ email, password }: Credentials) =>
  email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH

// Checks that need no database, before an account is created
export function checkSignUp({
  email,
  password,
  confirm,
}: Credentials & { confirm: string }): SignUpError | null {
  if (email.length > MAX_EMAIL_LENGTH) return 'invalidEmail'
  const problem = passwordProblem(password, { email })
  if (problem) return problem
  if (password !== confirm) return 'mismatch'
  return null
}
