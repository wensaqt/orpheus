import Link from 'next/link'

import { Divider } from '@front/_components/ui/Divider/Divider'
import { createComposition } from '@front/_features/compositions/actions'
import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import { LyreButton } from './_components/LyreButton/LyreButton'
import { LyreSide } from './_components/LyreButton/types'
import { NewCompositionButton } from './_components/NewCompositionButton'
import styles from './home.module.css'

export default async function HomePage() {
  const t = await getT()
  return (
    <>
      <header className={styles.introduction}>
        <p className={styles.wordmark}>{t('app.name')}</p>
        <h1>{t('home.introduction.heading')}</h1>
        <p className={styles.introductionSubtitle}>{t('home.introduction.subtitle')}</p>
      </header>
      <div className={styles.container}>
        {/* Created via POST (server action): a link would be prefetched and create documents */}
        <form action={createComposition} className={styles.section}>
          <NewCompositionButton
            className={styles.sectionButton}
            text={t('home.create.title')}
            subtitle={t('home.create.subtitle')}
          />
        </form>
        <LyreButton
          className={styles.sectionButton}
          side={LyreSide.Right}
          href={ROUTES.compositions}
          text={t('home.browse.title')}
          subtitle={t('home.browse.subtitle')}
        />
        {/* After the buttons so it stays above their background */}
        <Divider className={styles.divider} />
      </div>
      <footer className={styles.footer}>
        <Link href={ROUTES.about}>{t('home.about')}</Link>
      </footer>
    </>
  )
}
