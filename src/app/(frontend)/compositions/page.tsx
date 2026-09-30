import { lexicalExcerpt } from '../_lib/excerpt'
import { t } from '../_lib/i18n'
import { ROUTES } from '../_lib/routes'
import { requireUser } from '../_lib/session'
import { BackLink } from '../_components/ui/BackLink/BackLink'
import { CompositionGrid } from './CompositionGrid'
import { CreateCompositionForm } from './CreateCompositionForm'
import styles from './page.module.css'
import type { CompositionCardData } from './types'

// Longueur de l'aperçu affiché sur chaque feuille
const EXCERPT_LENGTH = 320

export default async function CompositionsPage() {
  const { payload, user } = await requireUser(ROUTES.compositions)
  const { docs } = await payload.find({
    collection: 'compositions',
    user,
    overrideAccess: false,
    depth: 0,
    sort: '-updatedAt',
    select: { title: true, updatedAt: true, content: true, page: true },
    pagination: false,
  })

  // Le contenu est réduit à son extrait ici, côté serveur, pour garder la page légère
  const compositions: CompositionCardData[] = docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
    excerpt: lexicalExcerpt(doc.content, EXCERPT_LENGTH),
    format: doc.page.format,
    orientation: doc.page.orientation,
  }))

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
