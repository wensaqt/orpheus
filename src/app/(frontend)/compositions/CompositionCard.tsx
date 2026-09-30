import Link from 'next/link'
import React from 'react'

import { pageSize } from '@/lib/pageFormats'

import { formatDateTime, formatRelative } from '../_lib/format'
import { ROUTES } from '../_lib/routes'
import styles from './CompositionCard.module.css'
import { CompositionActions } from './CompositionActions'
import type { CompositionCardData } from './types'

// Une composition présentée comme une miniature de sa feuille, aux proportions de son format
export function CompositionCard({ composition }: { composition: CompositionCardData }) {
  const { id, title, updatedAt, excerpt, format, orientation } = composition
  const { width, height } = pageSize({ format, orientation })

  return (
    <li className={styles.card}>
      <Link href={ROUTES.composition(id)} className={styles.link}>
        <span
          className={styles.sheet}
          style={{ '--sheet-ratio': `${width} / ${height}` } as React.CSSProperties}
        >
          <span className={styles.excerpt}>{excerpt}</span>
        </span>
        <span className={styles.title}>{title}</span>
        <time className={styles.date} dateTime={updatedAt} title={formatDateTime(updatedAt)}>
          {formatRelative(updatedAt)}
        </time>
      </Link>
      {/* Hors du lien : un bouton ne peut pas être imbriqué dans un lien */}
      <CompositionActions id={id} title={title} />
    </li>
  )
}
