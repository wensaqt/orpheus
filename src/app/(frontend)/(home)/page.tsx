import { Divider } from '@front/_components/ui/Divider/Divider'
import { createComposition } from '@front/_features/compositions/actions'
import { t } from '@front/_lib/i18n'
import { ROUTES } from '@front/_lib/routes'

import { LyreButton } from './_components/LyreButton/LyreButton'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <div className={styles.container}>
      {/* Création en POST (server action) : un lien serait préchargé et créerait des documents */}
      <form action={createComposition} className={styles.section}>
        <LyreButton
          type="submit"
          className={styles.sectionButton}
          side="left"
          text={t('home.create.title')}
          subtitle={t('home.create.subtitle')}
        />
      </form>
      <LyreButton
        className={styles.sectionButton}
        side="right"
        href={ROUTES.compositions}
        text={t('home.browse.title')}
        subtitle={t('home.browse.subtitle')}
      />
      {/* Après les boutons pour rester au-dessus de leur fond */}
      <Divider className={styles.divider} />
    </div>
  )
}
