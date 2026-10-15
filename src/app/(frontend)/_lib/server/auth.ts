import 'server-only'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload, type Payload, type TypedUser } from 'payload'
import { cache } from 'react'

import config from '@/payload.config'

import { ROUTES } from '../routes'
import { type ActionResult, sessionExpired } from '../actionResult'

export type Session = { payload: Payload; user: TypedUser }

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

/*
 * Payload client and signed-in user (from the Payload session cookie), or a null user.
 * Memoised per request with React cache(): pages, data access and actions can all call it
 * without re-reading the session.
 */
export const getSession = cache(async () => {
  const requestHeaders = new Headers(await headers())
  // cookies() includes Server Action writes; the incoming Cookie header can still be stale.
  requestHeaders.set('cookie', (await cookies()).toString())
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  return { payload, user }
})

// Resource guard for data access and server actions: throws when nobody is signed in
export async function requireSession(): Promise<Session> {
  const { payload, user } = await getSession()
  if (!user) throw new UnauthorizedError()
  return { payload, user }
}

// Page guard: sends anonymous visitors to the login page, then back to returnTo
export async function requireUser(returnTo: string): Promise<Session> {
  const { payload, user } = await getSession()
  if (!user) redirect(ROUTES.login(returnTo))
  return { payload, user }
}

/*
 * Wraps a server action so it always runs with a verified session. Server actions are public POST
 * endpoints (the proxy does not cover every route they are called from), so each one must guard
 * itself; this keeps that guard in one place.
 */
export function authedAction<Args extends unknown[], Result>(
  handler: (session: Session, ...args: Args) => Promise<Result>,
) {
  return async (...args: Args): Promise<Result> => handler(await requireSession(), ...args)
}

// Persistence failures are recoverable UI states; never turn an expired session into a 500.
export function authedSave<Args extends unknown[], Data>(
  handler: (session: Session, ...args: Args) => Promise<ActionResult<Data>>,
) {
  return async (...args: Args): Promise<ActionResult<Data>> => {
    const { payload, user } = await getSession()
    return user ? handler({ payload, user }, ...args) : sessionExpired
  }
}
