import React from 'react'

import './_styles/tokens.css'
import './_styles/base.css'
import { AccountMenu } from './_components/ui/AccountMenu/AccountMenu'
import { FeedbackProvider } from './_components/ui/Feedback/FeedbackProvider'
import { HomeLink } from './_components/ui/HomeLink/HomeLink'
import { nunitoSans } from './_styles/fonts'
import { APP_LOCALE, t } from './_lib/i18n'
import { getSession } from './_lib/server/auth'

export const metadata = {
  description: t('app.name'),
  title: t('app.name'),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  // For display only (who is signed in): pages and actions do their own checks
  const { user } = await getSession()

  return (
    <html lang={APP_LOCALE} className={nunitoSans.variable}>
      <body>
        <FeedbackProvider>
          {/* On every page: the logo links back home */}
          <HomeLink />
          <AccountMenu email={user?.email ?? null} />
          <main>{children}</main>
        </FeedbackProvider>
      </body>
    </html>
  )
}
