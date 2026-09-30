// @vitest-environment node
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { SESSION_COOKIE } from '@front/_lib/auth'
import { config, proxy } from '@/proxy'

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: cookie ? { cookie } : undefined,
  })

describe('proxy', () => {
  it('redirects a protected route without a session cookie to the login page', () => {
    const response = proxy(request('/compositions/12?view=grid'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/admin/login?redirect=%2Fcompositions%2F12%3Fview%3Dgrid',
    )
  })

  it('lets a protected route through when a session cookie is present', () => {
    const response = proxy(request('/compositions', `${SESSION_COOKIE}=token`))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('leaves public routes alone', () => {
    for (const path of ['/', '/compositionsfoo', '/admin/login']) {
      expect(proxy(request(path)).headers.get('location')).toBeNull()
    }
  })

  it('matches the protected prefix and its sub-paths', () => {
    expect(config.matcher).toEqual(['/compositions/:path*'])
  })
})
