import { createComposition } from '@front/_features/compositions/actions'
import { t } from '@front/_lib/i18n'

import styles from './CompositionCard.module.css'

// First grid cell: a blank sheet that creates a composition (POST, server action)
export function NewCompositionCard() {
  return (
    <li className={styles.card}>
      <form action={createComposition}>
        <button type="submit" className={`${styles.link} ${styles.buttonReset}`}>
          <span className={`${styles.sheet} ${styles.blank}`}>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
          </span>
          <span className={styles.title}>{t('compositions.create')}</span>
        </button>
      </form>
    </li>
  )
}
