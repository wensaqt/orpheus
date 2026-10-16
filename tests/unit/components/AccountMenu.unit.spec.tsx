import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { descriptionOf } from '../../helpers/dom'

const toastError = vi.fn()
vi.mock('@front/_components/ui/Feedback/ToastProvider', () => ({
  useToast: () => ({ error: toastError }),
}))
const logOut = vi.fn()
vi.mock('@front/_features/auth/actions', () => ({ logOut }))
const pathname = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: pathname, useRouter: () => ({ push }) }))

// jsdom has no Popover API; the browser's own behaviour is not under test here
HTMLElement.prototype.hidePopover ??= () => {}

const { AccountMenu } = await import('@front/_components/ui/AccountMenu/AccountMenu')

describe('AccountMenu', () => {
  beforeEach(() => {
    logOut.mockReset().mockResolvedValue(undefined)
    pathname.mockReturnValue('/compositions/12')
  })
  // Without Vitest globals, Testing Library does not unmount between tests on its own
  afterEach(cleanup)

  it('says who is signed in, with the profile greyed out for now', () => {
    render(<AccountMenu email="orphee@example.test" />)
    const menu = screen.getByRole('menu', { hidden: true })
    const description = descriptionOf(menu)
    expect(description?.textContent).toBe('Signed in as orphee@example.test')
    const profile = screen.getByRole('menuitem', { name: 'Profile', hidden: true })
    expect(profile.getAttribute('aria-disabled')).toBe('true')
    expect(profile.getAttribute('title')).toBe('Coming soon')
  })

  it('signs out from the menu', async () => {
    render(<AccountMenu email="orphee@example.test" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out', hidden: true }))
    })
    expect(logOut).toHaveBeenCalledOnce()
  })

  it('offers visitors to sign in and come back to the current page', () => {
    render(<AccountMenu email={null} />)
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
      '/login?redirect=%2Fcompositions%2F12',
    )
  })

  it('stays out of the way on the sign-in and sign-up pages', () => {
    for (const page of ['/login', '/signup']) {
      pathname.mockReturnValue(page)
      const { container } = render(<AccountMenu email={null} />)
      expect(container.innerHTML).toBe('')
      cleanup()
    }
  })
})

it('offers invitation management only to administrators', async () => {
  const view = render(<AccountMenu email="admin@example.test" administrator />)
  await act(async () => {
    fireEvent.click(screen.getByRole('menuitem', { name: 'Beta invitations', hidden: true }))
  })
  expect(push).toHaveBeenCalledWith('/beta/invitations')
  view.rerender(<AccountMenu email="user@example.test" />)
  expect(screen.queryByRole('menuitem', { name: 'Beta invitations', hidden: true })).toBeNull()
  cleanup()
})
