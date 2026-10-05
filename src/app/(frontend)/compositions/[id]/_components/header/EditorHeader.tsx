'use client'

import type { Ref } from 'react'

import { MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'

import { useT } from '@front/_components/i18n/I18nProvider'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'
import { saveComposition } from '@front/_features/compositions/actions'
import { useTitleField } from '@front/_hooks/useTitleField'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/useSaveRegistry'
import { Ruler } from '../page/Ruler'
import { usePageSettings } from '../page/PageSettingsProvider'
import styles from './EditorHeader.module.css'
import { PageSetup } from './PageSetup'

type EditorHeaderProps = {
  title: string
  // Filled by the open document with its own title
  documentTitleRef: Ref<HTMLDivElement>
}

/*
 * The editor's header, which stays on screen while the pages scroll: where the writer is
 * (composition › document), the toolbar, then the ruler over the sheet
 */
export function EditorHeader({ title, documentTitleRef }: EditorHeaderProps) {
  const t = useT()
  const { compositionId } = useBinder()
  const { status: pageStatus } = usePageSettings()
  const field = useTitleField({
    title,
    maxLength: MAX_COMPOSITION_TITLE_LENGTH,
    save: (next) => saveComposition(compositionId, { title: next }),
  })
  useRegisterSaver(SAVERS.compositionTitle, field)

  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        <TitleInput
          size="md"
          className={styles.compositionTitle}
          aria-label={t('editor.titleLabel')}
          {...field.inputProps}
        />
        <span className={styles.separator} aria-hidden="true">
          ›
        </span>
        <div ref={documentTitleRef} className={styles.documentTitle} />
        {/* Only save failures are reported; everything else happens silently */}
        {field.status === 'error' || pageStatus === 'error' ? (
          <p className={styles.saveError} role="alert">
            {t('editor.saveError')}
          </p>
        ) : null}
      </div>
      <div className={styles.toolbar} role="toolbar" aria-label={t('editor.toolbar')}>
        <PageSetup />
      </div>
      <Ruler />
    </header>
  )
}
