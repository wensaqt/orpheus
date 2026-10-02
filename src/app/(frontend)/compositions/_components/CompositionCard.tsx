import Link from 'next/link'

import type { CompositionCardData } from '@front/_features/compositions/types'
import { getFormatters } from '@front/_lib/format'
import { getLocale } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import styles from './CompositionCard.module.css'
import { CompositionActions } from './CompositionActions'

// A composition shown as a sheet thumbnail; all have the same shape
export async function CompositionCard({ composition }: { composition: CompositionCardData }) {
  const { id, title, updatedAt, excerpt, firstDocumentId } = composition
  const { formatDateTime, formatRelative } = getFormatters(await getLocale())

  return (
    <li className={styles.card}>
      <Link href={ROUTES.editor(id, firstDocumentId)} className={styles.link}>
        <span className={styles.sheet}>
          <span className={styles.excerpt}>{excerpt}</span>
        </span>
        <span className={styles.title}>{title}</span>
        <time className={styles.date} dateTime={updatedAt} title={formatDateTime(updatedAt)}>
          {formatRelative(updatedAt)}
        </time>
      </Link>
      {/* Outside the link: a button cannot be nested inside a link */}
      <CompositionActions id={id} title={title} />
    </li>
  )
}
