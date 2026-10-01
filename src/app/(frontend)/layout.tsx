import React from 'react'

import './_styles/tokens.css'
import './_styles/base.css'
import { I18nProvider } from './_components/i18n/I18nProvider'
import { CornerActions } from './_components/ui/CornerActions/CornerActions'
import { FeedbackProvider } from './_components/ui/Feedback/FeedbackProvider'
import { HomeLink } from './_components/ui/HomeLink/HomeLink'
import { nunitoSans } from './_styles/fonts'
import { getSession } from './_lib/server/auth'
import { getLocale, getT } from './_lib/server/i18n'

export async function generateMetadata() {
  const t = await getT()
  return { description: t('app.name'), title: t('app.name') }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  // For display only (who is signed in): pages and actions do their own checks
  const { user } = await getSession()
  const locale = await getLocale()

  return (
    <html lang={locale} className={nunitoSans.variable}>
      <body>
        <I18nProvider locale={locale}>
          <FeedbackProvider>
            {/* On every page: the logo links back home, the corner holds language and account */}
            <HomeLink />
            <CornerActions email={user?.email ?? null} />
            <main>{children}</main>
          </FeedbackProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
