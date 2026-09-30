import Image from 'next/image'

import lyreMark from '@front/_assets/images/lyre-mark.png'
import { CreateCompositionForm } from '@front/_features/compositions/CreateCompositionForm'
import { t } from '@front/_lib/i18n'

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
