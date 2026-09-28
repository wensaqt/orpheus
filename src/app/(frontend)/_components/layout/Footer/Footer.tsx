import Link from 'next/link'
import React from 'react'

import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Link href="/admin">Administration</Link>
    </footer>
  )
}
