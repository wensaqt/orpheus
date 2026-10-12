import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { invitationHash } from '@/lib/betaInvitations'

const session = vi.fn()
vi.mock('@front/_lib/server/auth', () => ({ getSession: session }))
const { issueInvitation } = await import('@front/beta/invitations/actions')
const count = vi.fn()
const create = vi.fn()
const user = { id: 'admin', role: 'admin' }
const previous = { email: '', url: null, error: null }
function form(email: string) {
  const data = new FormData()
  data.set('email', email)
  return data
}

beforeEach(() => {
  vi.stubEnv('APP_URL', 'https://beta.example')
  count.mockReset().mockResolvedValue({ totalDocs: 0 })
  create.mockReset().mockResolvedValue({ id: 'invitation' })
  session.mockReset().mockResolvedValue({ payload: { count, create }, user })
})
afterEach(() => vi.unstubAllEnvs())

it.each([null, { role: 'user' }])(
  'refuses invitation generation without an administrator session',
  async (user) => {
    session.mockResolvedValue({ payload: { count, create }, user })
    expect(await issueInvitation(previous, form('invited@example.test'))).toMatchObject({
      error: 'forbidden',
      url: null,
    })
    expect(count).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  },
)

it('binds the link to the email, stores only its hash and retains collection access checks', async () => {
  const result = await issueInvitation(previous, form(' Invited@Example.test '))
  expect(result.error).toBeNull()
  const link = new URL(result.url!)
  expect(link.origin).toBe('https://beta.example')
  expect(link.pathname).toBe('/signup')
  const token = link.searchParams.get('invite')!
  expect(token).toMatch(/^[a-f0-9]{64}$/)
  expect(create.mock.calls[0][0]).toMatchObject({
    collection: 'beta-invitations',
    user,
    overrideAccess: false,
    data: { email: 'invited@example.test', tokenHash: invitationHash(token) },
  })
  expect(JSON.stringify(create.mock.calls[0][0])).not.toContain(token)
})

it('refuses an invalid or already registered email before issuing a token', async () => {
  expect(await issueInvitation(previous, form('invalid'))).toMatchObject({
    error: 'invalidEmail',
    url: null,
  })
  expect(count).not.toHaveBeenCalled()
  count.mockResolvedValue({ totalDocs: 1 })
  expect(await issueInvitation(previous, form('taken@example.test'))).toMatchObject({
    error: 'taken',
    url: null,
  })
  expect(create).not.toHaveBeenCalled()
})

it('refuses an unconfigured or insecure origin', async () => {
  vi.stubEnv('APP_URL', 'http://beta.example')
  expect(await issueInvitation(previous, form('invited@example.test'))).toMatchObject({
    error: 'unavailable',
    url: null,
  })
  expect(create).not.toHaveBeenCalled()
})

it('reports failed storage without exposing a usable invitation link or logging secrets', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  create.mockRejectedValue(new Error('private database details'))
  expect(await issueInvitation(previous, form('invited@example.test'))).toMatchObject({
    error: 'unavailable',
    url: null,
  })
  expect(warn).toHaveBeenCalledWith('Could not issue a beta invitation.')
  warn.mockRestore()
})
