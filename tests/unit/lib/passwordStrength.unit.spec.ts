import { describe, expect, it } from 'vitest'

import { passwordProblem } from '@/lib/passwords/strength'

const email = 'eurydice@example.test'

describe('passwordProblem', () => {
  it('accepts a passphrase, without asking for capitals, digits or symbols', () => {
    expect(passwordProblem('la lyre dans la nuit', { email })).toBeNull()
    expect(passwordProblem('thrace mountains', { email })).toBeNull()
  })

  it('refuses a password outside the length limits', () => {
    expect(passwordProblem('bite1234')).toBe('tooShort')
    expect(passwordProblem('x'.repeat(129))).toBe('tooLong')
  })

  it('refuses the most used passwords, whatever the case', () => {
    expect(passwordProblem('azertyuiop123')).toBe('common')
    expect(passwordProblem('PASSWORD1234')).toBe('common')
  })

  it("refuses a password built on the email's name or the app's name", () => {
    expect(passwordProblem('Eurydice-2026', { email })).toBe('personal')
    expect(passwordProblem('my orpheus account')).toBe('personal')
  })

  it('does not hold a very short email name against the password', () => {
    expect(passwordProblem('a quiet joyful song', { email: 'jo@example.test' })).toBeNull()
  })

  it('refuses repetitions and keyboard or alphabet runs', () => {
    expect(passwordProblem('abababababab')).toBe('predictable')
    expect(passwordProblem('qsdfghjklmwx')).toBe('predictable')
    expect(passwordProblem('nmlkjihgfedcba')).toBe('predictable')
    expect(passwordProblem('789012345678')).toBe('predictable')
  })
})
