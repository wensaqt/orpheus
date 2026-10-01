import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logIn = vi.fn()
vi.mock('@front/_features/auth/actions', () => ({ logIn }))

const { LoginForm } = await import('@front/(auth)/login/_components/LoginForm')

async function submit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  await act(async () => {
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!)
  })
}

describe('LoginForm', () => {
  beforeEach(() => {
    logIn.mockReset()
    render(<LoginForm returnTo="/compositions" />)
  })
  // Without Vitest globals, Testing Library does not unmount between tests on its own
  afterEach(cleanup)

  it('sends the credentials and the page to come back to', async () => {
    logIn.mockResolvedValue({ error: null, email: '' })
    await submit('orphee@example.test', 'lyre')
    const form: FormData = logIn.mock.calls[0][1]
    expect(Object.fromEntries(form)).toEqual({
      email: 'orphee@example.test',
      password: 'lyre',
      redirect: '/compositions',
    })
  })

  it('announces a failed attempt, links it to the fields and keeps the email', async () => {
    logIn.mockResolvedValue({ error: 'invalid', email: 'orphee@example.test' })
    await submit('orphee@example.test', 'wrong')
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Incorrect email or password.')
    const email = screen.getByLabelText('Email') as HTMLInputElement
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toBe(alert.id)
    expect(email.value).toBe('orphee@example.test')
  })
})
