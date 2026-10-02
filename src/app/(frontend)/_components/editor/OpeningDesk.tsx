'use client'

import { createPortal } from 'react-dom'

import { DEFAULT_PAGE, toPageSettings } from '@/lib/pageFormats'

import { useT } from '@front/_components/i18n/I18nProvider'

import { PageSheet } from './PageSheet'
import styles from './OpeningDesk.module.css'

/*
 * Shown over the current page while a new composition is created and its editor loads: the
 * desk and a blank sheet, as the editor will look. Revealed after a short wait only, so a fast
 * opening shows nothing. Driven by the pending form, not by streaming, so that pages keep
 * answering real 404s.
 */
export function OpeningDesk() {
  const t = useT()
  return createPortal(
    <div className={styles.desk} aria-busy="true">
      <p className="visually-hidden" role="status">
        {t('compositions.opening')}
      </p>
      <PageSheet settings={toPageSettings(DEFAULT_PAGE)}>{null}</PageSheet>
    </div>,
    document.body,
  )
}
