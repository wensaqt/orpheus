import Image from 'next/image'
import Link from 'next/link'

import lyreMark from '@front/_assets/images/lyre-mark.png'
import { getT } from '@front/_lib/server/i18n'
import { ROUTES } from '@front/_lib/routes'

import styles from './HomeLink.module.css'

// Intrinsic square dimensions; CSS sets the displayed size with --control-size
const LOGO_SIZE = 28

// The logo, in the top-left corner, links back to the home page
export async function HomeLink() {
  const t = await getT()
  const label = t('app.home')
  return (
    <Link href={ROUTES.home} className={styles.home} aria-label={label} title={label}>
      <Image src={lyreMark} alt="" width={LOGO_SIZE} height={LOGO_SIZE} priority />
    </Link>
  )
}
