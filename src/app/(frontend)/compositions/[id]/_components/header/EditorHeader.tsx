'use client'

import { type Ref, type RefObject, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@front/_lib/routes'

import { MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'

import { useT } from '@front/_components/i18n/I18nProvider'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'
import { saveComposition } from '@front/_features/compositions/actions'
import { SaveStatus } from '@front/_hooks/types'
import { useTitleField } from '@front/_hooks/useTitleField'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/saverKeys'
import { useOpenEditor } from '../editorFocus'
import { useEditorView } from '../editorView'
import { useLayout } from '../page/LayoutProvider'
import styles from './EditorHeader.module.css'
import { MenuBar } from './MenuBar'
import { StyleToolbar } from './StyleToolbar'
import { useToolbarState } from './useToolbarState'
import { ScoreMenuBar } from '../score/ScoreMenuBar'

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
  const view = useEditorView()
  const t = useT()
  const pathname = usePathname()
  const { compositionId, entries, activeDocumentId } = useBinder()
  const scoreOpen = entries.some(
    (entry) => entry.id === activeDocumentId && entry.documentType === 'score',
  )
  const { status: layoutStatus, failure: layoutFailure } = useLayout()
  const field = useTitleField({
    title,
    maxLength: MAX_COMPOSITION_TITLE_LENGTH,
    save: (next) => saveComposition(compositionId, { title: next }),
  })
  useRegisterSaver(SAVERS.compositionTitle, field)
  const sessionExpired = field.failure === 'session-expired' || layoutFailure === 'session-expired'
  const toolbarState = useToolbarState(useOpenEditor())
  const headerRef = useRef<HTMLElement>(null)
  useContinuousHeaderHeight(headerRef, view.continuous && !scoreOpen)

  return (
    <header
      ref={headerRef}
      data-mobile-navigation={view.continuous && !view.sidebarAvailable && !scoreOpen}
      className={styles.header}
      data-editor-header=""
      data-score={scoreOpen}
      data-continuous={view.continuous && !scoreOpen}
    >
      <div className={styles.titles} data-editor-titles="">
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
        {field.status === SaveStatus.Error || layoutStatus === SaveStatus.Error ? (
          <p className={styles.saveError} role="alert">
            {t(sessionExpired ? 'editor.sessionExpiredSettings' : 'editor.saveError')}
            {sessionExpired && (
              <Link data-reconnect href={ROUTES.login(pathname)}>
                {t('account.logIn')}
              </Link>
            )}
          </p>
        ) : null}
      </div>
      {scoreOpen ? <ScoreMenuBar /> : <MenuBar state={toolbarState} />}
      {!scoreOpen && <StyleToolbar state={toolbarState} />}
    </header>
  )
}

function useContinuousHeaderHeight(headerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const header = headerRef.current
    const screen = header?.closest<HTMLElement>('[data-editor-screen]')
    if (!header || !screen || !enabled) return
    // Wrapping, translated labels and save errors can all change the sticky header's height.
    const measure = () =>
      screen.style.setProperty(
        '--measured-editor-header-height',
        `${header.getBoundingClientRect().height}px`,
      )
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    measure()
    return () => {
      observer.disconnect()
      screen.style.removeProperty('--measured-editor-header-height')
    }
  }, [headerRef, enabled])
}
