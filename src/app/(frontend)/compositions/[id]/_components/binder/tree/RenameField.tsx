'use client'

import { useRef, useState } from 'react'

import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'

import { useT } from '@front/_components/i18n/I18nProvider'

import styles from './BinderRow.module.css'

type RenameFieldProps = {
  title: string
  // The new title, or null when cancelled or unchanged
  onDone: (title: string | null) => void
}

// A row's title, editable in place: Enter or leaving the field saves, Escape cancels
export function RenameField({ title, onDone }: RenameFieldProps) {
  const t = useT()
  const [value, setValue] = useState(title)
  // Enter then the blur that follows must not finish twice
  const finished = useRef(false)

  const finish = (next: string | null) => {
    if (finished.current) return
    finished.current = true
    const trimmed = next?.trim()
    onDone(trimmed && trimmed !== title ? trimmed : null)
  }

  return (
    <input
      className={styles.rename}
      aria-label={t('binder.renameLabel', { title })}
      value={value}
      maxLength={MAX_BINDER_TITLE_LENGTH}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') finish(null)
      }}
      onBlur={() => finish(value)}
    />
  )
}
