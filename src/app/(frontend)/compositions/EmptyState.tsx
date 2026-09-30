import Image from 'next/image'

import lyreMark from '../_public/images/lyre-mark.png'
import { t } from '../_lib/i18n'
import { CreateCompositionForm } from './CreateCompositionForm'
import styles from './EmptyState.module.css'

export function EmptyState() {
  return (
    <div className={styles.empty}>
      <Image src={lyreMark} alt="" width={72} height={72} className={styles.mark} />
      <p className={styles.title}>{t('compositions.empty.title')}</p>
      <p className={styles.subtitle}>{t('compositions.empty.subtitle')}</p>
      <CreateCompositionForm />
    </div>
  )
}
