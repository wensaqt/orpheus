import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { formOf } from '../../helpers/dom'

const issue = vi.fn()
vi.mock('@front/beta/invitations/actions', () => ({ issueInvitation: issue }))
const { InvitationForm } = await import('@front/beta/invitations/InvitationForm')
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('shows the generated link and copies it without sending an email', async () => {
  const url = 'https://beta.example/signup?invite=test'
  issue.mockResolvedValue({ email: 'invited@example.test', url, error: null })
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<InvitationForm />)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invited@example.test' } })
  await act(async () =>
    fireEvent.submit(formOf(screen.getByRole('button', { name: 'Generate invitation' }))),
  )
  expect(screen.getByLabelText('Invitation link').getAttribute('readonly')).not.toBeNull()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy link' })))
  expect(writeText).toHaveBeenCalledWith(url)
  expect(screen.getByRole('status').textContent).toContain('Link copied')
})

it('shows a recoverable message when the clipboard is unavailable', async () => {
  issue.mockResolvedValue({
    email: 'invited@example.test',
    url: 'https://beta.example/signup?invite=test',
    error: null,
  })
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  })
  render(<InvitationForm />)
  await act(async () =>
    fireEvent.submit(formOf(screen.getByRole('button', { name: 'Generate invitation' }))),
  )
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy link' })))
  expect(screen.getByRole('status').textContent).toContain('copy it manually')
})
