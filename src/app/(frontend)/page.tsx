import { Divider } from './_components/ui/Divider/Divider'
import { LyreButton } from './_components/ui/LyreButton/LyreButton'
import { ROUTES } from './_lib/routes'
import { createComposition } from './compositions/actions'
import styles from './page.module.css'

const COPY = {
  create: { text: 'New composition', subtitle: 'Start a new piece' },
  browse: { text: 'All compositions', subtitle: 'Revisit your pieces' },
}

export default function HomePage() {
  return (
    <div className={styles.container}>
      {/* Création en POST (server action) : un lien serait préchargé et créerait des documents */}
      <form action={createComposition} className={styles.section}>
        <LyreButton type="submit" className={styles.sectionButton} side="left" {...COPY.create} />
      </form>
      <LyreButton
        className={styles.sectionButton}
        side="right"
        href={ROUTES.compositions}
        {...COPY.browse}
      />
      {/* Après les boutons pour rester au-dessus de leur fond */}
      <Divider className={styles.divider} />
    </div>
  )
}
