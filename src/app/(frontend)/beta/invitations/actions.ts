'use server'

import { APIError } from 'payload'
import { newInvitation } from '@/lib/betaInvitations'
import { isAdmin, MAX_EMAIL_LENGTH } from '@/lib/users'
import { getSession } from '@front/_lib/server/auth'
import type { InvitationState } from './types'

/** Authenticate each call: hiding the page does not protect a server action endpoint. */
export async function issueInvitation(
  _previous: InvitationState,
  form: FormData,
): Promise<InvitationState> {
  const { payload, user } = await getSession()
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase()
  const state = { email, url: null }
  if (!isAdmin(user)) return { ...state, error: 'forbidden' }
  if (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ...state, error: 'invalidEmail' }
  try {
    const origin = process.env.APP_URL
    if (!origin || new URL(origin).protocol !== 'https:') return { ...state, error: 'unavailable' }
    const { totalDocs } = await payload.count({
      collection: 'users',
      where: { email: { equals: email } },
      user,
      overrideAccess: false,
    })
    if (totalDocs) return { ...state, error: 'taken' }
    const invitation = newInvitation(email)
    await payload.create({
      collection: 'beta-invitations',
      data: invitation.data,
      user,
      overrideAccess: false,
    })
    const url = new URL('/signup', origin)
    url.searchParams.set('invite', invitation.token)
    return { email, url: url.toString(), error: null }
  } catch (error) {
    if (error instanceof APIError && error.status === 400)
      return { ...state, error: 'invalidEmail' }
    // Never log the raw invitation, recipient or connection credentials.
    console.warn('Could not issue a beta invitation.')
    return { ...state, error: 'unavailable' }
  }
}
