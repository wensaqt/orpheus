'use client'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'

import { DocumentIcon } from '../binder/icons'
import { useBinder } from '../binder/state/BinderProvider'
import styles from './EmptyBinder.module.css'

// In place of the sheet when the binder holds no document: the way to start one
export function EmptyBinder() {
  const t = useT()
  const { commands } = useBinder()
  return (
    <div className={styles.empty}>
      <p className={styles.text}>{t('binder.empty')}</p>
      <Button onClick={() => void commands.create('document', null)}>
        <DocumentIcon />
        {t('binder.newDocument')}
      </Button>
    </div>
  )
}
