import Image from 'next/image'
import Link from 'next/link'

import lyreMark from '@front/_assets/images/lyre-mark.png'
import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import styles from './HomeLink.module.css'

// The logo, in the top-left corner, links back to the home page
export async function HomeLink() {
  const t = await getT()
  const label = t('app.home')
  return (
    <Link href={ROUTES.home} className={styles.home} aria-label={label} title={label}>
      <Image src={lyreMark} alt="" width={28} height={28} priority />
    </Link>
  )
}
