import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { toSignUpError } from '@front/_features/auth/errors'
import { checkSignUp } from '@front/_features/auth/validation'

const validation = (path: string) =>
  new ValidationError({ collection: 'users', errors: [{ path, message: 'invalid' }] })

describe('checkSignUp', () => {
  it('accepts a long enough password typed twice', () => {
    expect(checkSignUp({ password: 'eurydice', confirm: 'eurydice' })).toBeNull()
  })

  it('reports a short password before a mismatch', () => {
    expect(checkSignUp({ password: 'lyre', confirm: 'harp' })).toBe('weak')
    expect(checkSignUp({ password: 'eurydice', confirm: 'eurydic' })).toBe('mismatch')
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
