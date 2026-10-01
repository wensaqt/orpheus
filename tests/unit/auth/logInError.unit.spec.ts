import { AuthenticationError, LockedAuth } from 'payload'
import { describe, expect, it } from 'vitest'

import { toLogInError } from '@front/_features/auth/errors'

describe('toLogInError', () => {
  it('maps Payload sign-in errors to the reason shown on the form', () => {
    expect(toLogInError(new AuthenticationError())).toBe('invalid')
    expect(toLogInError(new LockedAuth())).toBe('locked')
  })

  it('treats anything else as unexpected', () => {
    expect(toLogInError(new Error('database down'))).toBe('unknown')
  })
})
