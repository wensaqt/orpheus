import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SESSION_COOKIE } from '@front/_lib/auth'

const logout = vi.fn()
const deleteCookie = vi.fn()
const redirect = vi.fn()
vi.mock('@payloadcms/next/auth', () => ({ logout, login: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ delete: deleteCookie }) }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@payload-config', () => ({ default: {} }))

const { logOut } = await import('@front/_features/auth/actions')

describe('logOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logout.mockReset()
  })

  it.each(['User logged out successfully', 'User already logged out'])(
    'clears the session cookie and returns home when Payload reports %s',
    async (message) => {
      logout.mockResolvedValue({ success: true, message })
      await logOut()
      expect(deleteCookie).toHaveBeenCalledWith(SESSION_COOKIE)
      expect(redirect).toHaveBeenCalledWith('/')
      expect(deleteCookie.mock.invocationCallOrder[0]).toBeLessThan(
        redirect.mock.invocationCallOrder[0],
      )
    },
  )

  it('reports failed session revocation instead of pretending to sign out', async () => {
    logout.mockResolvedValue({ success: false, message: 'Logout failed' })
    await expect(logOut()).rejects.toThrow('Could not end the session.')
    expect(deleteCookie).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('does not hide infrastructure errors', async () => {
    logout.mockRejectedValue(new Error('Database unavailable'))
    await expect(logOut()).rejects.toThrow('Database unavailable')
    expect(redirect).not.toHaveBeenCalled()
  })
})
