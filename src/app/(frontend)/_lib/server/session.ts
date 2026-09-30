import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { ROUTES } from '@front/_lib/routes'

// Client Payload et utilisateur connecté (via le cookie de session de l'admin), ou null
export async function getSession() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return { payload, user }
}

// Pour les pages : renvoie vers la connexion, puis de retour sur returnTo
export async function requireUser(returnTo: string) {
  const { payload, user } = await getSession()
  if (!user) redirect(ROUTES.login(returnTo))
  return { payload, user }
}
