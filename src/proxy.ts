import { type NextRequest, NextResponse } from 'next/server'

import { isProtectedPath, SESSION_COOKIE } from '@front/_lib/auth'
import { ROUTES } from '@front/_lib/routes'

/*
 * Optimistic route protection: a request for a protected route without a session cookie is sent
 * to the login page before anything renders. This is only a fast path — the cookie is not
 * verified here. Pages, data access and server actions still check the session themselves, and
 * Payload access control guards the data.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (isProtectedPath(pathname) && !request.cookies.has(SESSION_COOKIE))
    return NextResponse.redirect(new URL(ROUTES.login(`${pathname}${search}`), request.url))
  return securedPageResponse(request)
}

function securedPageResponse(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return NextResponse.next()
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

// Static matcher required by Next. APIs use Payload access and CSRF checks, not this page guard.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|css|js)$).*)',
  ],
}
