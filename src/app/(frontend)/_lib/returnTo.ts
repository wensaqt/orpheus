import { ROUTES } from './routes'

/*
 * Where to go after signing in. The value comes from the URL, so it is untrusted: only a path on
 * this site is accepted ("/compositions"), never an absolute URL or a protocol-relative one
 * ("//evil.example", "/\evil.example"), which would make the login page an open redirect.
 */
export function safeReturnTo(value: unknown, fallback: string = ROUTES.home): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
