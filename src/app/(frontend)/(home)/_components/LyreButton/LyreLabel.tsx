import styles from '../../home.module.css'
import { LyreSide } from './types'

type LyreLabelProps = {
  side: LyreSide
  title: string
  subtitle?: string
}

// Title, rule and subtitle; the rule draws out from the lyre's axis when the parent is hovered
export function LyreLabel({ side, title, subtitle }: LyreLabelProps) {
  return (
    <span className={styles.label} data-side={side}>
      <span className={styles.title}>{title}</span>
      <span className={styles.line} aria-hidden="true" />
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </span>
  )
}
