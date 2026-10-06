import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { descriptionOf, formOf } from '../../helpers/dom'

const signUp = vi.fn()
vi.mock('@front/_features/auth/actions', () => ({ signUp }))

const { SignupForm } = await import('@front/(auth)/signup/_components/SignupForm')

async function submit(fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
  await act(async () => {
    fireEvent.submit(formOf(screen.getByRole('button', { name: 'Create account' })))
  })
}

const filled = {
  Email: 'orphee@example.test',
  Password: 'eurydice',
  'Confirm password': 'eurydice',
}

describe('SignupForm', () => {
  beforeEach(() => {
    signUp.mockReset()
    render(<SignupForm returnTo="/" />)
  })
  // Without Vitest globals, Testing Library does not unmount between tests on its own
  afterEach(cleanup)

  it('explains the password rule next to the field', () => {
    const password = screen.getByLabelText('Password')
    const hint = descriptionOf(password)
    expect(hint?.textContent).toBe('At least 12 characters. A short phrase works well.')
  })

  it('sends both passwords and the page to come back to', async () => {
    signUp.mockResolvedValue({ error: null, email: '' })
    await submit(filled)
    const form: FormData = signUp.mock.calls[0][1]
    expect(Object.fromEntries(form)).toEqual({
      email: 'orphee@example.test',
      password: 'eurydice',
      confirm: 'eurydice',
      redirect: '/',
    })
  })

  it('flags only the fields an error is about', async () => {
    signUp.mockResolvedValue({ error: 'taken', email: 'orphee@example.test' })
    await submit(filled)
    expect(screen.getByRole('alert').textContent).toBe('An account already exists for this email.')
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBeNull()
  })

  it('states the minimum length when the password is too short', async () => {
    signUp.mockResolvedValue({ error: 'tooShort', email: 'orphee@example.test' })
    await submit({ ...filled, Password: 'lyre', 'Confirm password': 'lyre' })
    expect(screen.getByRole('alert').textContent).toBe(
      'Use at least 12 characters for the password.',
    )
    expect(screen.getByLabelText('Confirm password').getAttribute('aria-invalid')).toBeNull()
  })
})
