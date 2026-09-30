import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { ROUTES } from '@front/_lib/routes'

// Payload client and signed-in user (via the admin session cookie), or null
export async function getSession() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return { payload, user }
}

// For pages: redirects to login, then back to returnTo
export async function requireUser(returnTo: string) {
  const { payload, user } = await getSession()
  if (!user) redirect(ROUTES.login(returnTo))
  return { payload, user }
}
