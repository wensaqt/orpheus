import Link from 'next/link'
import Image from 'next/image'

import creatorPortrait from '../../../../public/guilhem-coding-perspective.png'

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
            {t('about.author.title')}
          </Heading>
          <p className={styles.profession}>{t('about.author.role')}</p>
          <p className={styles.lead}>{t('about.author.background')}</p>
          <a className={styles.storyLink} href="#about-project">
            <span aria-hidden="true">↓</span> {t('about.scroll')}
          </a>
        </div>
        <aside className={styles.profile}>
          <Image
            className={styles.portrait}
            src={creatorPortrait}
            alt={t('about.author.portraitAlt')}
            sizes="(max-width: 700px) 85vw, 352px"
            preload
          />
          <p className={styles.interests}>
            <q>{t('about.author.curiosity')}</q>
          </p>
        </aside>
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
        <div className={styles.prose}>
          <p>{t('about.author.writing')}</p>
        </div>
      </section>

      <div className={styles.interlude}>
        <MusicalThread />
      </div>

      <section className={styles.chapter} aria-labelledby="about-project">
        <div className={styles.chapterHeading}>
          <span className={styles.number} aria-hidden="true">
            02
          </span>
          <Heading level={2} variant="panel" id="about-project">
            {t('about.heading')}
          </Heading>
        </div>
        <div className={styles.project}>
          <p className={styles.prose}>{t('about.introduction')}</p>
          <StoryIllustration />
        </div>
      </section>

      <section className={styles.chapter} aria-labelledby="about-origin">
        <div className={styles.chapterHeading}>
          <span className={styles.number} aria-hidden="true">
            03
          </span>
          <Heading level={2} variant="panel" id="about-origin">
            {t('about.origin.heading')}
          </Heading>
        </div>
        <p className={styles.prose}>{t('about.origin.text')}</p>
      </section>

      <section className={styles.chapter} aria-labelledby="about-intention">
        <div className={styles.chapterHeading}>
          <span className={styles.number} aria-hidden="true">
            04
          </span>
          <Heading level={2} variant="panel" id="about-intention">
            {t('about.intention.heading')}
          </Heading>
        </div>
        <p className={styles.prose}>{t('about.intention.text')}</p>
      </section>

      <footer className={styles.footer}>
        <a className={styles.link} href="/cv_guilhem_final.pdf" download>
          {t('about.downloadCv')}
        </a>
        <Link className={styles.link} href={ROUTES.home}>
          {t('about.backHome')} <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </article>
  )
}
