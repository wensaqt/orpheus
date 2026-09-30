import { listCompositionCards } from '@front/_features/compositions/queries'
import { t } from '@front/_lib/i18n'
import { ROUTES } from '@front/_lib/routes'
import { requireUser } from '@front/_lib/server/auth'

import { CompositionGrid } from './_components/CompositionGrid'
import styles from './page.module.css'

export default async function CompositionsPage() {
  await requireUser(ROUTES.compositions)
  const compositions = await listCompositionCards()

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.heading}>{t('compositions.heading')}</h1>
        </header>
        <CompositionGrid compositions={compositions} />
      </div>
    </div>
  )
}
