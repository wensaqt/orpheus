'use server'

import { login, logout } from '@payloadcms/next/auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { findInvitation } from '@/lib/betaInvitations'

import { safeReturnTo } from '@front/_lib/returnTo'
import { SESSION_COOKIE } from '@front/_lib/auth'
import { RETURN_TO_PARAM, ROUTES } from '@front/_lib/routes'

import { toLogInError, toSignUpError } from './errors'
import type { LogInState, SignUpState } from './types'
import { checkSignUp, exceedsCredentialLimits } from './validation'

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/*
 * Signs in with Payload (which checks the password, counts failed attempts and sets the session
 * cookie), then goes back to the page that asked for it.
 */
export async function logIn(_previous: LogInState, form: FormData): Promise<LogInState> {
  const email = field(form, 'email').trim()
  const password = field(form, 'password')
  if (!email || !password || exceedsCredentialLimits({ email, password })) {
    return { error: 'invalid', email }
  }

  try {
    await login({ collection: 'users', config, email, password })
  } catch (error) {
    return { error: toLogInError(error), email }
  }
  // Outside the try: redirect() works by throwing
  revalidatePath('/', 'layout')
  redirect(safeReturnTo(form.get(RETURN_TO_PARAM)))
}

/*
 * Creates a regular, free account (the collection ignores any role or plan sent by a visitor),
 * consumes its email-bound invitation, signs it in and returns to the requested page.
 */
export async function signUp(_previous: SignUpState, form: FormData): Promise<SignUpState> {
  const email = field(form, 'email').trim()
  const inviteToken = field(form, 'inviteToken')
  const password = field(form, 'password')
  const invalid = checkSignUp({ email, password, confirm: field(form, 'confirm') })
  if (invalid) return { error: invalid, email }

  try {
    const payload = await getPayload({ config })
    if (process.env.NODE_ENV === 'production') {
      const invitation = await findInvitation(payload, inviteToken)
      if (!invitation || invitation.email !== email.toLowerCase())
        return { error: 'betaClosed', email }
    }
    // Payload stores emails in lower case
    const { totalDocs } = await payload.count({
      collection: 'users',
      where: { email: { equals: email.toLowerCase() } },
    })
    if (totalDocs) return { error: 'taken', email }
    await payload.create({
      collection: 'users',
      data: { email, password },
      overrideAccess: false,
      context: { betaInviteToken: inviteToken },
    })
    await login({ collection: 'users', config, email, password })
  } catch (error) {
    return { error: toSignUpError(error), email }
  }
  revalidatePath('/', 'layout')
  redirect(safeReturnTo(form.get(RETURN_TO_PARAM)))
}

// Payload skips cookie deletion when the session is already invalid.
export async function logOut() {
  const result = await logout({ config })
  if (!result.success) throw new Error('Could not end the session.')
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect(ROUTES.home)
}
