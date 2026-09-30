// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }))

const { authedAction, UnauthorizedError } = await import('@front/_lib/server/auth')

describe('authedAction', () => {
  beforeEach(() => auth.mockReset())

  it('rejects the call without running the handler when nobody is signed in', async () => {
    auth.mockResolvedValue({ user: null })
    const handler = vi.fn()
    await expect(authedAction(handler)('arg')).rejects.toBeInstanceOf(UnauthorizedError)
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
