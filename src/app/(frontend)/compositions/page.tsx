import { BackLink } from '@front/_components/ui/BackLink/BackLink'
import { CreateCompositionForm } from '@front/_features/compositions/CreateCompositionForm'
import { listCompositionCards } from '@front/_features/compositions/queries'
import { t } from '@front/_lib/i18n'
import { ROUTES } from '@front/_lib/routes'
import { requireUser } from '@front/_lib/server/session'

import { CompositionGrid } from './_components/CompositionGrid'
import styles from './page.module.css'

export default async function CompositionsPage() {
  const session = await requireUser(ROUTES.compositions)
  const compositions = await listCompositionCards(session)

  return (
    <div className={styles.page}>
      <BackLink href={ROUTES.home} label={t('compositions.back')} />
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.heading}>{t('compositions.heading')}</h1>
          {compositions.length > 0 && <CreateCompositionForm />}
        </header>
        <CompositionGrid compositions={compositions} />
      </div>
    </div>
  )
}
