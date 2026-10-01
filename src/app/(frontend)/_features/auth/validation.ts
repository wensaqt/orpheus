import { MIN_PASSWORD_LENGTH } from '@/lib/users'

import type { SignUpError } from './types'

// Checks that need no database, before an account is created
export function checkSignUp({
  password,
  confirm,
}: {
  password: string
  confirm: string
}): SignUpError | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'weak'
  if (password !== confirm) return 'mismatch'
  return null
}
