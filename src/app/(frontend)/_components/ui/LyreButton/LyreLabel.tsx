import React from 'react'

import styles from './LyreLabel.module.css'
import type { LyreSide } from './types'

type LyreLabelProps = {
  side: LyreSide
  title: string
  subtitle?: string
}

// Titre, filet et sous-titre ; le filet se trace depuis l'axe de la lyre au survol du parent
export function LyreLabel({ side, title, subtitle }: LyreLabelProps) {
  return (
    <span className={styles.label} data-side={side}>
      <span className={styles.title}>{title}</span>
      <span className={styles.line} aria-hidden="true" />
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </span>
  )
}
