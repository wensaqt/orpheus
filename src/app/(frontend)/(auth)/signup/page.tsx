import type { Metadata } from 'next'

import { t } from '@front/_lib/i18n'
import { ROUTES } from '@front/_lib/routes'

import { AuthSwitch } from '../_components/AuthSwitch'
import { guestReturnTo } from '../_lib/guestReturnTo'
import { SignupForm } from './_components/SignupForm'

export const metadata: Metadata = { title: t('auth.signup.pageTitle') }

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const returnTo = await guestReturnTo(searchParams)
  return (
    <>
      <SignupForm returnTo={returnTo} />
      <AuthSwitch
        question={t('auth.signup.switch.question')}
        action={t('auth.signup.switch.action')}
        href={ROUTES.login(returnTo)}
      />
    </>
  )
}
