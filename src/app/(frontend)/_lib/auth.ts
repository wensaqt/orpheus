import { ROUTES } from './routes'

// Session cookie set by Payload on login ("payload" cookie prefix + "-token")
export const SESSION_COOKIE = 'payload-token'

// Route prefixes that require a signed-in user (keep in sync with the matcher in src/proxy.ts)
export const PROTECTED_PREFIXES = [ROUTES.compositions]

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
