import assert from 'node:assert/strict'

// This destructive fixture run is restricted to the disposable local/CI production database.
const base = new URL(process.env.SMOKE_URL ?? process.env.APP_URL ?? 'http://localhost:3000')
assert(
  ['localhost', '127.0.0.1'].includes(base.hostname),
  'Smoke fixtures must never run against a public deployment.',
)
const password = 'local smoke test password 42'
const invite = 'ci-only-beta-invitation-with-at-least-32-characters'

async function request(path, { body, cookie, method = 'POST', withInvite = false } = {}) {
  return fetch(new URL(path, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: base.origin,
      ...(cookie ? { cookie } : {}),
      ...(withInvite ? { 'x-beta-invite': invite } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  })
}

async function create(email) {
  const response = await request('/api/users', {
    body: { email, password, role: 'admin', plan: 'pro' },
    withInvite: true,
  })
  assert.equal(response.status, 201)
  const { doc } = await response.json()
  assert.equal(doc.role, 'user')
  assert.equal(doc.plan, 'free')
  return doc
}

async function session(email) {
  const response = await request('/api/users/login', { body: { email, password } })
  assert.equal(response.status, 200)
  const token = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('payload-token='))
  assert(token?.includes('HttpOnly'))
  assert(/secure/i.test(token))
  return token.split(';')[0]
}

assert.equal(
  (
    await request('/api/users', {
      body: { email: 'not-invited@example.test', password },
      withInvite: true,
    })
  ).status,
  403,
)
assert.equal(
  (await request('/api/users', { body: { email: 'beta-first@example.test', password } })).status,
  403,
)
const first = await create('beta-first@example.test')
const other = await create('beta-other@example.test')
const ownSession = await session(first.email)
const otherSession = await session(other.email)
const compositionResponse = await request('/api/compositions', {
  body: { title: 'Private smoke document', owner: other.id },
  cookie: ownSession,
})
assert.equal(compositionResponse.status, 201)
const { doc: composition } = await compositionResponse.json()
assert.equal(
  typeof composition.owner === 'string' ? composition.owner : composition.owner.id,
  first.id,
)
for (const method of ['GET', 'PATCH', 'DELETE']) {
  const response = await request(`/api/compositions/${composition.id}`, {
    body: method === 'PATCH' ? { title: 'Intrusion' } : undefined,
    cookie: otherSession,
    method,
  })
  assert([403, 404].includes(response.status), `Cross-user ${method} must be refused.`)
}
assert.equal((await request('/api/media', { method: 'GET' })).status, 403)
assert.equal(
  (await request('/api/users/forgot-password', { body: { email: first.email } })).status,
  503,
)
assert(!(await request('/api/graphql', { body: { query: '{ Users { totalDocs } }' } })).ok)
const login = await request('/login', { method: 'GET' })
assert.equal(login.status, 200)
assert(login.headers.get('content-security-policy')?.includes('strict-dynamic'))
assert.equal(login.headers.get('x-content-type-options'), 'nosniff')
console.log(
  'Production smoke checks passed: invitations, roles, cookies, owner isolation, media, GraphQL and CSP.',
)
