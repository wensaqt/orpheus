'use server'

import { login, logout } from '@payloadcms/next/auth'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { canRegisterEmail, verifyBetaInvite } from '@/lib/deployment'

import { safeReturnTo } from '@front/_lib/returnTo'
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
  redirect(safeReturnTo(form.get(RETURN_TO_PARAM)))
}

/*
 * Creates a regular, free account (the collection ignores any role or plan sent by a visitor),
 * signs it in and goes back to the page that asked for it. No email verification yet: it needs
 * an email provider.
 */
export async function signUp(_previous: SignUpState, form: FormData): Promise<SignUpState> {
  const email = field(form, 'email').trim()
  const inviteCode = field(form, 'inviteCode')
  if (!canRegisterEmail(email) || !verifyBetaInvite(inviteCode))
    return { error: 'betaClosed', email }
  const password = field(form, 'password')
  const invalid = checkSignUp({ email, password, confirm: field(form, 'confirm') })
  if (invalid) return { error: invalid, email }

  try {
    const payload = await getPayload({ config })
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
      context: { betaInviteCode: inviteCode },
    })
    await login({ collection: 'users', config, email, password })
  } catch (error) {
    return { error: toSignUpError(error), email }
  }
  redirect(safeReturnTo(form.get(RETURN_TO_PARAM)))
}

// Ends the session (Payload clears the cookie) and goes back to the home page
export async function logOut() {
  await logout({ config })
  redirect(ROUTES.home)
}
