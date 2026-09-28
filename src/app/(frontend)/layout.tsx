import React from 'react'

import './_styles/tokens.css'
import './_styles/base.css'
import { nunitoSans } from './_styles/fonts'

export const metadata = {
  description: 'Orpheus',
  title: 'Orpheus',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="fr" className={nunitoSans.variable}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
