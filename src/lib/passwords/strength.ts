import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/users'

import { COMMON_PASSWORDS } from './commonPasswords'

/*
 * Password rules, after NIST SP 800-63B: length matters, composition rules (a capital, a digit,
 * a symbol) do not, as they only lead to "Password1!". Instead, passwords anyone would try first
 * are refused: the most used ones, ones built on the account's email or the app's name, and
 * keyboard runs or repetitions.
 */
export type PasswordProblem = 'tooShort' | 'tooLong' | 'common' | 'personal' | 'predictable'

// Words a guess would start with for an Orpheus account
const OBVIOUS_WORDS = ['orpheus']
// Shorter email names ("jo@…") would refuse too many unrelated passwords
const MIN_EMAIL_NAME_LENGTH = 4
// Fewer distinct characters than this is a repetition ("abababababab")
const MIN_DISTINCT_CHARACTERS = 5
// Runs a password can be cut from: alphabet, digits, AZERTY and QWERTY keyboard rows
const RUNS = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'azertyuiopqsdfghjklmwxcvbn',
  'qwertyuiopasdfghjklzxcvbnm',
]

// Whether the text is a slice of a run, forwards or backwards, wrapping around ("890123")
function isRun(text: string) {
  return RUNS.some((run) => {
    const loop = run.repeat(Math.ceil(text.length / run.length) + 1)
    return loop.includes(text) || [...loop].reverse().join('').includes(text)
  })
}

export function passwordProblem(
  password: string,
  { email }: { email?: string | null } = {},
): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort'
  if (password.length > MAX_PASSWORD_LENGTH) return 'tooLong'

  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) return 'common'

  const emailName = email?.split('@')[0]?.toLowerCase() ?? ''
  const personal = [
    ...OBVIOUS_WORDS,
    ...(emailName.length >= MIN_EMAIL_NAME_LENGTH ? [emailName] : []),
  ]
  if (personal.some((word) => lower.includes(word))) return 'personal'

  if (new Set(lower).size < MIN_DISTINCT_CHARACTERS || isRun(lower)) return 'predictable'
  return null
}
