'use client'

import type { LexicalEditor } from 'lexical'
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import type { Layout } from '@/lib/layout'
import type { Id } from '@/lib/ids'

import { useT } from '@front/_components/i18n/I18nProvider'
import { classNames } from '@front/_lib/classNames'
import { Dialog, DialogTitle } from '@front/_components/ui/Dialog/Dialog'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import type { BinderEntry } from '@front/_features/binder/types'
import { toGeometry } from '@front/_components/editor/pagination/pageGeometry'
import { BINDER_HIDDEN_COOKIE, setPreferenceCookie } from '@front/_lib/preferences'

import { BinderPanel } from './binder/BinderPanel'
import { BinderIcon, SynonymsIcon } from './icons'
import { BinderProvider, useBinder } from './binder/state/BinderProvider'
import styles from './EditorShell.module.css'
import { DocumentTitleSlot } from './header/documentTitleSlot'
import { EditorHeader } from './header/EditorHeader'
import { OpenEditorContext } from './editorFocus'
import { LayoutProvider, useLayout } from './page/LayoutProvider'
import { Ruler } from './page/Ruler'
import { useEditorDisplay } from './editorDisplay'
import { useSideRoom } from './sideRoom'
import { HistoryProvider, historyShortcut, useEditorHistory } from './history/HistoryProvider'
import { EditorViewProvider, useEditorView } from './editorView'
import { SynonymsPanel } from './SynonymsPanel'
import { ScoreCommandProvider } from './score/ScoreCommands'
import { MobileDocumentNavigator } from './document/MobileDocumentNavigator'

type EditorShellProps = {
  fontClassName: string
  ownerId: Id
  compositionId: Id
  title: string
  layout: Layout
  entries: BinderEntry[]
  // Remembered in cookies, so the page renders with the side panels as the writer left them
  bookView: boolean
  bookViewAvailable: boolean
  rulerHidden: boolean
  binderHidden: boolean
  synonymsHidden: boolean
  // The open document (or the empty binder's invitation)
  children: ReactNode
}

/*
 * The editor: its header on top (titles, toolbars), then the "desk", where the sheet stays
 * centred in the middle column under its ruler, the binder takes the left one and the
 * synonyms the right one.
 */
export function EditorShell({
  fontClassName,
  compositionId,
  ownerId,
  title,
  layout,
  entries,
  binderHidden,
  synonymsHidden,
  rulerHidden,
  bookView,
  bookViewAvailable,
  children,
}: EditorShellProps) {
  // Set once the header is mounted: the open document puts its title there
  const [documentTitleSlot, setDocumentTitleSlot] = useState<HTMLDivElement | null>(null)
  // The open document's editor, for the header's tools
  const [openEditor, setOpenEditor] = useState<LexicalEditor | null>(null)
  const display = useEditorDisplay()
  const t = useT()
  const toast = useToast()
  const warnedComposition = useRef<Id | null>(null)
  useEffect(() => {
    if (
      !display.ready ||
      display.continuous ||
      bookViewAvailable ||
      warnedComposition.current === compositionId
    )
      return
    // Show once per composition opening, including Strict Mode's effect replay.
    warnedComposition.current = compositionId
    toast.show(t('editor.safariWarning'))
  }, [display.ready, display.continuous, bookViewAvailable, compositionId, t, toast])

  return (
    <HistoryProvider>
      <BinderProvider ownerId={ownerId} compositionId={compositionId} entries={entries}>
        <LayoutProvider initial={layout}>
          <OpenEditorContext value={{ editor: openEditor, setEditor: setOpenEditor }}>
            <EditorViewProvider
              continuous={display.continuous}
              sidebarAvailable={display.sidebar}
              bookView={bookView}
              bookViewAvailable={bookViewAvailable}
              rulerHidden={rulerHidden}
              synonymsHidden={synonymsHidden}
            >
              <ScoreCommandProvider>
                <DocumentTitleSlot value={documentTitleSlot}>
                  <HistoryScreen fontClassName={fontClassName}>
                    <EditorHeader title={title} documentTitleRef={setDocumentTitleSlot} />
                    <Desk binderHidden={binderHidden}>{children}</Desk>
                  </HistoryScreen>
                </DocumentTitleSlot>
              </ScoreCommandProvider>
            </EditorViewProvider>
          </OpenEditorContext>
        </LayoutProvider>
      </BinderProvider>
    </HistoryProvider>
  )
}

/*
 * The binder, the sheet and the synonyms side by side. Either panel folds to a small button,
 * as the writer leaves it. Without room for the synonyms beside the sheet, they fold on their
 * own, and their button opens them over the page instead, for as long as they are needed.
 */
function Desk({ binderHidden, children }: Pick<EditorShellProps, 'binderHidden' | 'children'>) {
  const t = useT()
  const { layout } = useLayout()
  const [binderFolded, setBinderFolded] = useState(binderHidden)
  const [binderOver, setBinderOver] = useState(false)
  const view = useEditorView()
  const { entries, activeDocumentId } = useBinder()
  const scoreOpen = entries.some(
    (entry) => entry.id === activeDocumentId && entry.documentType === 'score',
  )
  const lastDocument = useRef(activeDocumentId)
  useEffect(() => {
    if (lastDocument.current === activeDocumentId) return
    lastDocument.current = activeDocumentId
    setBinderOver(false)
  }, [activeDocumentId])
  const continuous = view.continuous && !scoreOpen
  const binderDrawer = view.continuous && !view.sidebarAvailable
  const desk = useRef<HTMLDivElement>(null)
  const binderCell = useRef<HTMLDivElement>(null)
  const panelProbe = useRef<HTMLDivElement>(null)
  const column = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const showSynonyms = useRef<HTMLButtonElement>(null)
  const binderTrigger = useRef<HTMLButtonElement>(null)
  const pageWidth = toGeometry(layout.page).width
  useSideRoom(desk, binderCell, panelProbe, view.bookView ? pageWidth * 2 : pageWidth, view.setRoom)
  useEffect(() => {
    const container = column.current
    const pages = surface.current
    if (!container || !pages) return
    if (!view.bookView) {
      pages.style.removeProperty('--book-scale')
      pages.style.removeProperty('--book-gap')
      return
    }
    const resize = () => {
      const gap = parseFloat(getComputedStyle(pages).columnGap)
      const width = pageWidth * 2 + gap
      pages.style.setProperty('--book-gap', `${gap}px`)
      pages.style.setProperty('--book-scale', String(Math.min(1, container.clientWidth / width)))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [view.bookView, pageWidth])

  const foldBinder = (next: boolean) => {
    setBinderFolded(next)
    setPreferenceCookie(BINDER_HIDDEN_COOKIE, next)
  }
  // Back to the button that opened them, shown at once to take the focus
  const hideSynonyms = () => {
    flushSync(view.hideSynonyms)
    showSynonyms.current?.focus()
  }
  const over = view.synonymsOver

  const showBinder = () => {
    if (binderDrawer) {
      view.hideSynonyms()
      setBinderOver(true)
    } else foldBinder(false)
  }
  const hideBinder = () => {
    if (binderDrawer) setBinderOver(false)
    else foldBinder(true)
  }
  const openSynonyms = () => {
    setBinderOver(false)
    view.showSynonyms()
  }

  function handleSynonymsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (over && event.key === 'Escape') hideSynonyms()
  }

  return (
    <div
      ref={desk}
      className={styles.desk}
      data-continuous={continuous}
      data-compact={view.continuous}
      data-sidebar={view.continuous && view.sidebarAvailable}
      data-book={!scoreOpen && view.bookView}
      data-score={scoreOpen}
      data-mobile-navigation={binderDrawer}
    >
      <div ref={binderCell} className={styles.binder}>
        {binderDrawer ? null : binderFolded ? (
          <IconButton
            ref={binderTrigger}
            label={t('binder.show')}
            icon={<BinderIcon />}
            className={styles.show}
            onClick={showBinder}
          />
        ) : (
          <BinderPanel onHide={hideBinder} />
        )}
      </div>
      {binderDrawer ? (
        <Dialog
          open={binderOver}
          onClose={() => setBinderOver(false)}
          labelledBy="editor-binder-title"
          className={styles.drawer}
        >
          <DialogTitle id="editor-binder-title">{t('binder.label')}</DialogTitle>
          <BinderPanel onHide={hideBinder} />
        </Dialog>
      ) : null}
      {binderDrawer ? <MobileDocumentNavigator onOpenBinder={showBinder} /> : null}
      <div ref={column} className={styles.column}>
        <div ref={surface} className={styles.pageSurface}>
          {!scoreOpen && view.rulerVisible && <Ruler />}
          {children}
        </div>
      </div>
      {!scoreOpen && (
        <div className={styles.aside}>
          {/* As wide as the open panel: whether it fits is measured with it */}
          <div ref={panelProbe} className={styles.panelProbe} aria-hidden="true" />
          {!view.synonymsVisible ? (
            <IconButton
              ref={showSynonyms}
              label={t('synonyms.show')}
              tooltipAlign="end"
              icon={<SynonymsIcon />}
              className={styles.show}
              onClick={openSynonyms}
            />
          ) : continuous ? (
            <Dialog
              open={view.synonymsVisible}
              onClose={hideSynonyms}
              labelledBy="editor-synonyms-title"
              className={styles.drawer}
            >
              <span id="editor-synonyms-title" className="visually-hidden">
                {t('synonyms.title')}
              </span>
              <SynonymsPanel onHide={hideSynonyms} />
            </Dialog>
          ) : (
            <div className={styles.synonyms} data-over={over} onKeyDown={handleSynonymsKeyDown}>
              <SynonymsPanel onHide={hideSynonyms} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryScreen({
  children,
  fontClassName,
}: Pick<EditorShellProps, 'children' | 'fontClassName'>) {
  const history = useEditorHistory()
  const { entries, activeDocumentId } = useBinder()
  const scoreOpen = entries.some(
    (entry) => entry.id === activeDocumentId && entry.documentType === 'score',
  )
  const view = useEditorView()
  return (
    <div
      data-editor-screen=""
      data-compact={view.continuous}
      data-score={scoreOpen}
      data-continuous={view.continuous && !scoreOpen}
      className={classNames(styles.screen, fontClassName)}
      onKeyDownCapture={scoreOpen ? undefined : (event) => historyShortcut(history, event)}
    >
      {children}
    </div>
  )
}
