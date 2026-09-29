import React from 'react'

import { type PageSettings, pageSize } from '@/lib/pageFormats'

import styles from './PageSheet.module.css'

type PageSheetProps = {
  settings: PageSettings
  children: React.ReactNode
}

// Feuille aux dimensions du format choisi ; elle s'allonge avec le texte (pas encore de pagination)
export function PageSheet({ settings, children }: PageSheetProps) {
  const { width, height } = pageSize(settings)
  const { top, right, bottom, left } = settings.margins

  const style = {
    '--page-width': `${width}mm`,
    '--page-height': `${height}mm`,
    '--page-padding': `${top}mm ${right}mm ${bottom}mm ${left}mm`,
  } as React.CSSProperties

  return (
    <article className={styles.sheet} style={style}>
      {children}
    </article>
  )
}
