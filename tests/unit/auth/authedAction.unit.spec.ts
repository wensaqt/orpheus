// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const requestHeaders = vi.fn()
const sessionCookies = vi.fn()
vi.mock('next/headers', () => ({ headers: requestHeaders, cookies: sessionCookies }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }))

const { authedAction, authedSave, getSession, UnauthorizedError } =
  await import('@front/_lib/server/auth')

describe('authedAction', () => {
  beforeEach(() => {
    auth.mockReset()
    requestHeaders.mockResolvedValue(new Headers())
    sessionCookies.mockResolvedValue({ toString: () => '' })
  })

  it('uses the updated cookie store while preserving origin and authorization checks', async () => {
    requestHeaders.mockResolvedValue(
      new Headers({ cookie: 'payload-token=old', origin: 'https://beta.example' }),
    )
    sessionCookies.mockResolvedValue({ toString: () => 'payload-token=new' })
    auth.mockResolvedValue({ user: { id: 7 } })
    await getSession()
    const verified = auth.mock.calls[0][0].headers as Headers
    expect(verified.get('cookie')).toBe('payload-token=new')
    expect(verified.get('origin')).toBe('https://beta.example')
  })

  it('does not resurrect a deleted cookie from the incoming headers', async () => {
    requestHeaders.mockResolvedValue(new Headers({ cookie: 'payload-token=old' }))
    auth.mockResolvedValue({ user: null })
    await getSession()
    expect(auth.mock.calls[0][0].headers.get('cookie')).toBe('')
  })

  it('rejects the call without running the handler when nobody is signed in', async () => {
    auth.mockResolvedValue({ user: null })
    const handler = vi.fn()
    await expect(authedAction(handler)('arg')).rejects.toBeInstanceOf(UnauthorizedError)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns an actionable expired-session result for persistence without running the handler', async () => {
    auth.mockResolvedValue({ user: null })
    const handler = vi.fn()
    await expect(authedSave(handler)('arg')).resolves.toEqual({
      status: 'error',
      reason: 'session-expired',
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the verified session, then the call arguments, to the handler', async () => {
    const user = { id: 7 }
    auth.mockResolvedValue({ user })
    const action = authedAction(
      async ({ user }, id: number, label: string) => `${user.id}:${id}:${label}`,
    )
    await expect(action(12, 'x')).resolves.toBe('7:12:x')
  })
})
