import { APIError, ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { toSignUpError } from '@front/_features/auth/errors'
import { checkSignUp, exceedsCredentialLimits } from '@front/_features/auth/validation'

const validation = (path: string) =>
  new ValidationError({ collection: 'users', errors: [{ path, message: 'invalid' }] })

const email = 'orphee@example.test'

describe('checkSignUp', () => {
  const good = 'eurydice in the dark'

  it('accepts a good password typed twice', () => {
    expect(checkSignUp({ email, password: good, confirm: good })).toBeNull()
  })

  it('reports a problem with the password before a mismatch', () => {
    expect(checkSignUp({ email, password: 'lyre', confirm: 'harp' })).toBe('tooShort')
    expect(checkSignUp({ email, password: 'orphee-forever', confirm: 'orphee-forever' })).toBe(
      'personal',
    )
    expect(checkSignUp({ email, password: good, confirm: `${good}!` })).toBe('mismatch')
  })

  it('refuses an email longer than the standards allow', () => {
    const password = 'eurydice in the dark'
    const tooLong = `${'a'.repeat(243)}@example.test`
    expect(checkSignUp({ email: tooLong, password, confirm: password })).toBe('invalidEmail')
  })
})

describe('exceedsCredentialLimits', () => {
  it('lets anything within the limits through, however short', () => {
    expect(exceedsCredentialLimits({ email: 'a@b.c', password: 'x' })).toBe(false)
    expect(exceedsCredentialLimits({ email, password: 'a'.repeat(128) })).toBe(false)
  })

  it('stops an oversized email or password', () => {
    expect(exceedsCredentialLimits({ email, password: 'a'.repeat(129) })).toBe(true)
    expect(exceedsCredentialLimits({ email: 'a'.repeat(255), password: 'eurydice' })).toBe(true)
  })
})

describe('toSignUpError', () => {
  it('reports an invitation denied during registration without hiding other server errors', () => {
    expect(toSignUpError(new APIError('Forbidden', 403))).toBe('betaClosed')
    expect(toSignUpError(new APIError('Unavailable', 503))).toBe('unknown')
  })
  it('maps an email rejected by the collection to a malformed address', () => {
    expect(toSignUpError(validation('email'))).toBe('invalidEmail')
  })

  it('treats anything else as unexpected', () => {
    // The form checks the password rules first: a password error here is not one to explain
    expect(toSignUpError(validation('password'))).toBe('unknown')
    expect(toSignUpError(validation('role'))).toBe('unknown')
    expect(toSignUpError(new Error('database down'))).toBe('unknown')
  })
})
