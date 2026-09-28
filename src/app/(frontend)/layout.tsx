import React from 'react'

import './_styles/tokens.css'
import './_styles/base.css'
import { Footer } from './_components/layout/Footer/Footer'
import { Header } from './_components/layout/Header/Header'
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
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
