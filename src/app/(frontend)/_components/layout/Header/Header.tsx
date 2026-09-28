import Link from 'next/link'
import React from 'react'

import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <Link href="/">Orpheus</Link>
    </header>
  )
}
