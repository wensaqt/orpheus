import type { Metadata } from 'next'

import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import { AuthSwitch } from '../_components/AuthSwitch'
import { guestReturnTo } from '../_lib/guestReturnTo'
import { LoginForm } from './_components/LoginForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t('auth.login.pageTitle') }
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const returnTo = await guestReturnTo(searchParams)
  const t = await getT()
  return (
    <>
      <LoginForm returnTo={returnTo} />
      <AuthSwitch
        question={t('auth.login.switch.question')}
        action={t('auth.login.switch.action')}
        href={ROUTES.signup(returnTo)}
      />
    </>
  )
}
