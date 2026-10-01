import Image from 'next/image'

import lyreMark from '@front/_assets/images/lyre-mark.png'
import { getT } from '@front/_lib/server/i18n'

import styles from './EmptyState.module.css'
import { NewCompositionCard } from './NewCompositionCard'

export async function EmptyState() {
  const t = await getT()
  return (
    <div className={styles.empty}>
      <Image src={lyreMark} alt="" width={72} height={72} className={styles.mark} />
      <p className={styles.title}>{t('compositions.empty.title')}</p>
      <p className={styles.subtitle}>{t('compositions.empty.subtitle')}</p>
      {/* Just the blank sheet: start there */}
      <ul className={styles.single}>
        <NewCompositionCard />
      </ul>
    </div>
  )
}
