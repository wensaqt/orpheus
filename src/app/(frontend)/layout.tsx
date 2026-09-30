import React from 'react'

import './_styles/tokens.css'
import './_styles/base.css'
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
        <main>{children}</main>
      </body>
    </html>
  )
}
