import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { toSignUpError } from '@front/_features/auth/errors'
import { checkSignUp, exceedsCredentialLimits } from '@front/_features/auth/validation'

const validation = (path: string) =>
  new ValidationError({ collection: 'users', errors: [{ path, message: 'invalid' }] })

const email = 'orphee@example.test'

describe('checkSignUp', () => {
  it('accepts a long enough password typed twice', () => {
    expect(checkSignUp({ email, password: 'eurydice', confirm: 'eurydice' })).toBeNull()
  })

  it('reports a password of the wrong length before a mismatch', () => {
    expect(checkSignUp({ email, password: 'lyre', confirm: 'harp' })).toBe('weak')
    const long = 'a'.repeat(129)
    expect(checkSignUp({ email, password: long, confirm: long })).toBe('tooLong')
    expect(checkSignUp({ email, password: 'eurydice', confirm: 'eurydic' })).toBe('mismatch')
  })

  it('refuses an email longer than the standards allow', () => {
    const password = 'eurydice'
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
  it('maps the collection validation to the field at fault', () => {
    expect(toSignUpError(validation('password'))).toBe('weak')
    expect(toSignUpError(validation('email'))).toBe('invalidEmail')
  })

  it('treats anything else as unexpected', () => {
    expect(toSignUpError(validation('role'))).toBe('unknown')
    expect(toSignUpError(new Error('database down'))).toBe('unknown')
  })
})
