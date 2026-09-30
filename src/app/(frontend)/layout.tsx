import React from 'react'

import './_styles/tokens.css'
import './_styles/base.css'
import { FeedbackProvider } from './_components/ui/Feedback/FeedbackProvider'
import { nunitoSans } from './_styles/fonts'
import { APP_LOCALE, t } from './_lib/i18n'

export const metadata = {
  description: t('app.name'),
  title: t('app.name'),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang={APP_LOCALE} className={nunitoSans.variable}>
      <body>
        <FeedbackProvider>
          <main>{children}</main>
        </FeedbackProvider>
      </body>
    </html>
  )
}
