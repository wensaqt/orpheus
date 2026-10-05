'use client'

import type { Ref } from 'react'

import { MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'

import { useT } from '@front/_components/i18n/I18nProvider'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'
import { saveComposition } from '@front/_features/compositions/actions'
import { useTitleField } from '@front/_hooks/useTitleField'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/useSaveRegistry'
import { useOpenEditor } from '../editorFocus'
import { useLayout } from '../page/LayoutProvider'
import styles from './EditorHeader.module.css'
import { MenuBar } from './MenuBar'
import { StyleToolbar } from './StyleToolbar'
import { useToolbarState } from './useToolbarState'

type EditorHeaderProps = {
  title: string
  // Filled by the open document with its own title
  documentTitleRef: Ref<HTMLDivElement>
}

/*
 * The editor's header, which stays on screen while the pages scroll: where the writer is
 * (composition › document), the menu bar, then the style toolbar, both following the open
 * document's selection. The ruler stays right under it, over the sheet
 */
export function EditorHeader({ title, documentTitleRef }: EditorHeaderProps) {
  const t = useT()
  const { compositionId } = useBinder()
  const { status: layoutStatus } = useLayout()
  const field = useTitleField({
    title,
    maxLength: MAX_COMPOSITION_TITLE_LENGTH,
    save: (next) => saveComposition(compositionId, { title: next }),
  })
  useRegisterSaver(SAVERS.compositionTitle, field)
  const toolbarState = useToolbarState(useOpenEditor())

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
        {field.status === 'error' || layoutStatus === 'error' ? (
          <p className={styles.saveError} role="alert">
            {t('editor.saveError')}
          </p>
        ) : null}
      </div>
      <MenuBar state={toolbarState} />
      <StyleToolbar state={toolbarState} />
    </header>
  )
}
