import Link from 'next/link'
import React from 'react'

import styles from './BackLink.module.css'

type BackLinkProps = {
  href: string
  label: string
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

// Retour discret posé dans le coin supérieur gauche, hors du flux de la page
export function BackLink({ href, label, onClick }: BackLinkProps) {
  return (
    <Link href={href} className={styles.back} onClick={onClick}>
      <span aria-hidden="true">←</span> {label}
    </Link>
  )
}
