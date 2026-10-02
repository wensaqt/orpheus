import { createComposition } from '@front/_features/compositions/actions'
import { getT } from '@front/_lib/server/i18n'

import styles from './CompositionCard.module.css'
import { NewCompositionSubmit } from './NewCompositionSubmit'

// First grid cell: a blank sheet that creates a composition (POST, server action)
export async function NewCompositionCard() {
  const t = await getT()
  return (
    <li className={styles.card}>
      <form action={createComposition}>
        <NewCompositionSubmit className={`${styles.link} ${styles.buttonReset}`}>
          <span className={`${styles.sheet} ${styles.blank}`}>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
          </span>
          <span className={styles.title}>{t('compositions.create')}</span>
        </NewCompositionSubmit>
      </form>
    </li>
  )
}
