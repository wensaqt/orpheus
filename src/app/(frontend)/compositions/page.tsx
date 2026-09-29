import Link from 'next/link'

import { ROUTES } from '../_lib/routes'
import { requireUser } from '../_lib/session'
import { createComposition } from './actions'
import { DeleteCompositionButton } from './DeleteCompositionButton'
import styles from './page.module.css'

const COPY = {
  heading: 'All compositions',
  create: 'New composition',
  empty: 'No compositions yet.',
  edited: 'Edited',
}

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })

export default async function CompositionsPage() {
  const { payload, user } = await requireUser(ROUTES.compositions)
  const { docs } = await payload.find({
    collection: 'compositions',
    user,
    overrideAccess: false,
    depth: 0,
    sort: '-updatedAt',
    select: { title: true, updatedAt: true },
    pagination: false,
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={ROUTES.home} className={styles.home}>
          Orpheus
        </Link>
        <h1 className={styles.heading}>{COPY.heading}</h1>
        <form action={createComposition}>
          <button type="submit" className={styles.create}>
            {COPY.create}
          </button>
        </form>
      </header>

      {docs.length ? (
        <ul className={styles.list}>
          {docs.map((composition) => (
            <li key={composition.id} className={styles.row}>
              <Link href={ROUTES.composition(composition.id)} className={styles.item}>
                <span className={styles.itemTitle}>{composition.title}</span>
                <span className={styles.itemDate}>
                  {COPY.edited} {dateFormat.format(new Date(composition.updatedAt))}
                </span>
              </Link>
              <DeleteCompositionButton id={composition.id} title={composition.title} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{COPY.empty}</p>
      )}
    </div>
  )
}
