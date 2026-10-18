import Link from 'next/link'
import Image from 'next/image'

import creatorPortrait from '../../../../public/guilhem-coding-perspective.png'

import { Heading } from '@front/_components/ui/Heading/Heading'
import buttonStyles from '@front/_components/ui/Button/Button.module.css'
import { ROUTES } from '@front/_lib/routes'
import { getT } from '@front/_lib/server/i18n'

import { MusicalThread, StoryIllustration } from './StoryIllustration'
import styles from './page.module.css'

const BETA_CONTACT_EMAIL = 'guilhemclarisse.pro@gmail.com'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('about.pageTitle'), description: t('about.description') }
}

export default async function AboutPage() {
  const t = await getT()
  const betaRequestHref = `mailto:${BETA_CONTACT_EMAIL}?subject=${encodeURIComponent(t('about.beta.emailSubject'))}&body=${encodeURIComponent(t('about.beta.emailBody'))}`

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
          <p className={styles.cvCallout}>
            {t('about.cvInterest')}{' '}
            <a className={styles.link} href="/cv_guilhem_final.pdf" download>
              {t('about.downloadCv')}
            </a>
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

      <section className={styles.betaAccess} aria-labelledby="about-beta">
        <Heading level={2} variant="panel" id="about-beta">
          {t('about.beta.heading')}
        </Heading>
        <p>{t('about.beta.description')}</p>
        <a
          className={`${buttonStyles.button} ${styles.betaLink}`}
          data-variant="primary"
          href={betaRequestHref}
        >
          {t('about.beta.requestAccess')}
        </a>
        <p className={styles.betaContact}>
          {t('about.beta.emailHint')}{' '}
          <a className={styles.link} href={betaRequestHref}>
            {BETA_CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.link} href={ROUTES.home}>
          {t('about.backHome')} <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </article>
  )
}
