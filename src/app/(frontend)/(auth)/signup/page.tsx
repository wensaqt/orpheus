import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { findInvitation } from '@/lib/betaInvitations'

import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import { AuthSwitch } from '../_components/AuthSwitch'
import { guestReturnTo } from '../_lib/guestReturnTo'
import { SignupForm } from './_components/SignupForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t('auth.signup.pageTitle'), referrer: 'no-referrer' }
}

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const returnTo = await guestReturnTo(searchParams)
  const t = await getT()
  const token = (await searchParams).invite
  const invitation =
    process.env.NODE_ENV === 'production'
      ? await findInvitation(await getPayload({ config }), token)
      : null
  const closed = process.env.NODE_ENV === 'production' && !invitation
  return (
    <>
      {closed ? (
        <p role="alert">{t('auth.signup.errors.betaClosed')}</p>
      ) : (
        <SignupForm
          returnTo={returnTo}
          invitation={
            invitation && typeof token === 'string' ? { token, email: invitation.email } : undefined
          }
        />
      )}
      <AuthSwitch
        question={t('auth.signup.switch.question')}
        action={t('auth.signup.switch.action')}
        href={ROUTES.login(returnTo)}
      />
    </>
  )
}
