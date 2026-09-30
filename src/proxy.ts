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
  if (!isProtectedPath(pathname) || request.cookies.has(SESSION_COOKIE)) return NextResponse.next()
  return NextResponse.redirect(new URL(ROUTES.login(`${pathname}${search}`), request.url))
}

// Must be a static literal (analysed at build time): mirrors PROTECTED_PREFIXES
export const config = {
  matcher: ['/compositions/:path*'],
}
