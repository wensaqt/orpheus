import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'

import styles from './page.module.css'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <div className={styles.container}>
      <div className={styles.sectionButton}>New composition</div>
      <div className={styles.sectionButton}>All compositions</div>
    </div>
  )
}
