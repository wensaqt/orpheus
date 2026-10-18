// @vitest-environment node
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SESSION_COOKIE } from '@front/_lib/auth'
import { config, proxy } from '@/proxy'

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: cookie ? { cookie } : undefined,
  })

describe('proxy', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('redirects a protected route without a session cookie to the login page', () => {
    const response = proxy(request('/compositions/12?view=grid'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fcompositions%2F12%3Fview%3Dgrid',
    )
  })

  it('lets a protected route through when a session cookie is present', () => {
    const response = proxy(request('/compositions', `${SESSION_COOKIE}=token`))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('lets Server Actions validate an absent session without redirecting away from unsaved writing', () => {
    const request = new NextRequest('http://localhost:3000/compositions/document', {
      method: 'POST',
    })
    expect(proxy(request).headers.get('location')).toBeNull()
  })

  it('leaves public routes alone', () => {
    for (const path of ['/', '/compositionsfoo', '/login', '/admin/login']) {
      expect(proxy(request(path)).headers.get('location')).toBeNull()
    }
  })

  it('covers pages while excluding APIs and static assets', () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`)
    for (const path of ['/login', '/admin', '/compositions/12'])
      expect(pattern.test(path)).toBe(true)
    for (const path of ['/api/users', '/_next/static/main.js', '/favicon.ico', '/font.woff2'])
      expect(pattern.test(path)).toBe(false)
  })

  it('uses a fresh script nonce per production request without allowing inline scripts', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const first = proxy(request('/login')).headers.get('Content-Security-Policy')!
    const second = proxy(request('/login')).headers.get('Content-Security-Policy')!
    expect(first).not.toBe(second)
    expect(first).toContain("script-src 'self' 'nonce-")
    expect(first).toContain("frame-ancestors 'none'")
    expect(first.split(';').find((directive) => directive.includes('script-src'))).not.toContain(
      'unsafe-inline',
    )
  })
})
