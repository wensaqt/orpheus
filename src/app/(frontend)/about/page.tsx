import Link from 'next/link'

import { Heading } from '@front/_components/ui/Heading/Heading'
import { ROUTES } from '@front/_lib/routes'
import { getT } from '@front/_lib/server/i18n'

import { MusicalThread, StoryIllustration } from './StoryIllustration'
import styles from './page.module.css'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('about.pageTitle'), description: t('about.description') }
}

export default async function AboutPage() {
  const t = await getT()

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>{t('about.pageTitle')}</p>
          <Heading level={1} variant="page" className={styles.title}>
            {t('about.heading')}
          </Heading>
          <p className={styles.lead}>{t('about.introduction')}</p>
          <a className={styles.storyLink} href="#about-author">
            <span aria-hidden="true">↓</span> {t('about.scroll')}
          </a>
        </div>
        <StoryIllustration />
      </header>

      <section className={styles.chapter} aria-labelledby="about-author">
        <div className={styles.chapterHeading}>
          <span className={styles.number} aria-hidden="true">
            01
          </span>
          <Heading level={2} variant="panel" id="about-author">
            {t('about.author.heading')}
          </Heading>
        </div>
        <div className={styles.author}>
          <div className={styles.prose}>
            <p>{t('about.author.background')}</p>
            <p>{t('about.author.writing')}</p>
            <p>{t('about.author.curiosity')}</p>
          </div>
          <aside className={styles.profile} aria-label={t('about.author.role')}>
            <span className={styles.monogram} aria-hidden="true">
              G.
            </span>
            <p className={styles.profileName}>Guilhem</p>
            <p className={styles.role}>{t('about.author.role')}</p>
            <p>{t('about.author.fields')}</p>
            <p className={styles.interests}>{t('about.author.interests')}</p>
          </aside>
        </div>
      </section>

      <div className={styles.interlude}>
        <MusicalThread />
      </div>

      <section className={styles.chapter} aria-labelledby="about-origin">
        <div className={styles.chapterHeading}>
          <span className={styles.number} aria-hidden="true">
            02
          </span>
          <Heading level={2} variant="panel" id="about-origin">
            {t('about.origin.heading')}
          </Heading>
        </div>
        <p className={styles.prose}>{t('about.origin.text')}</p>
      </section>

      <section
        className={`${styles.chapter} ${styles.intention}`}
        aria-labelledby="about-intention"
      >
        <div className={styles.chapterHeading}>
          <span className={styles.number} aria-hidden="true">
            03
          </span>
          <Heading level={2} variant="panel" id="about-intention">
            {t('about.intention.heading')}
          </Heading>
        </div>
        <p className={styles.prose}>{t('about.intention.text')}</p>
      </section>

      <footer className={styles.footer}>
        <p>{t('about.signature')}</p>
        <Link className={styles.link} href={ROUTES.home}>
          {t('about.backHome')} <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </article>
  )
}
