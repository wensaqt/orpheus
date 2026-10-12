import type { Metadata } from 'next'

import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import { AuthSwitch } from '../_components/AuthSwitch'
import { guestReturnTo } from '../_lib/guestReturnTo'
import { SignupForm } from './_components/SignupForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t('auth.signup.pageTitle') }
}

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const returnTo = await guestReturnTo(searchParams)
  const t = await getT()
  return (
    <>
      <SignupForm returnTo={returnTo} requiresInvite={process.env.NODE_ENV === 'production'} />
      <AuthSwitch
        question={t('auth.signup.switch.question')}
        action={t('auth.signup.switch.action')}
        href={ROUTES.login(returnTo)}
      />
    </>
  )
}
