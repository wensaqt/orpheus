'use client'

import type { LexicalEditor } from 'lexical'
import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import type { Layout } from '@/lib/layout'
import type { Id } from '@/lib/ids'

import { useT } from '@front/_components/i18n/I18nProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import type { BinderEntry } from '@front/_features/binder/types'
import { toGeometry } from '@front/_components/editor/pagination/pageGeometry'
import {
  BINDER_HIDDEN_COOKIE,
  setPreferenceCookie,
  SYNONYMS_HIDDEN_COOKIE,
} from '@front/_lib/preferences'

import { BinderPanel } from './binder/BinderPanel'
import { BinderIcon, SynonymsIcon } from './icons'
import { BinderProvider } from './binder/state/BinderProvider'
import styles from './EditorShell.module.css'
import { DocumentTitleSlot } from './header/documentTitleSlot'
import { EditorHeader } from './header/EditorHeader'
import { OpenEditorContext } from './editorFocus'
import { LayoutProvider, useLayout } from './page/LayoutProvider'
import { Ruler } from './page/Ruler'
import { useSideRoom } from './sideRoom'
import { SynonymsPanel } from './SynonymsPanel'

type EditorShellProps = {
  compositionId: Id
  title: string
  layout: Layout
  entries: BinderEntry[]
  // Remembered in cookies, so the page renders with the side panels as the writer left them
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
  compositionId,
  title,
  layout,
  entries,
  binderHidden,
  synonymsHidden,
  children,
}: EditorShellProps) {
  // Set once the header is mounted: the open document puts its title there
  const [documentTitleSlot, setDocumentTitleSlot] = useState<HTMLDivElement | null>(null)
  // The open document's editor, for the header's tools
  const [openEditor, setOpenEditor] = useState<LexicalEditor | null>(null)

  return (
    <BinderProvider compositionId={compositionId} entries={entries}>
      <LayoutProvider initial={layout}>
        <OpenEditorContext value={{ editor: openEditor, setEditor: setOpenEditor }}>
          <DocumentTitleSlot value={documentTitleSlot}>
            <div className={styles.screen}>
              <EditorHeader title={title} documentTitleRef={setDocumentTitleSlot} />
              <Desk binderHidden={binderHidden} synonymsHidden={synonymsHidden}>
                {children}
              </Desk>
            </div>
          </DocumentTitleSlot>
        </OpenEditorContext>
      </LayoutProvider>
    </BinderProvider>
  )
}

// Where the synonyms panel is
enum SynonymsPlace {
  Folded = 'folded',
  Beside = 'beside',
  // Opened over the page, for want of room beside it
  Over = 'over',
}

function synonymsPlace(room: boolean, folded: boolean, openedOver: boolean): SynonymsPlace {
  if (room) return folded ? SynonymsPlace.Folded : SynonymsPlace.Beside
  return openedOver ? SynonymsPlace.Over : SynonymsPlace.Folded
}

/*
 * The binder, the sheet and the synonyms side by side. Either panel folds to a small button,
 * as the writer leaves it. Without room for the synonyms beside the sheet, they fold on their
 * own, and their button opens them over the page instead, for as long as they are needed.
 */
function Desk({
  binderHidden,
  synonymsHidden,
  children,
}: Pick<EditorShellProps, 'binderHidden' | 'synonymsHidden' | 'children'>) {
  const t = useT()
  const { layout } = useLayout()
  const [binderFolded, setBinderFolded] = useState(binderHidden)
  const [synonymsFolded, setSynonymsFolded] = useState(synonymsHidden)
  // Opened over the page, for want of room beside it
  const [synonymsOver, setSynonymsOver] = useState(false)
  const desk = useRef<HTMLDivElement>(null)
  const binderCell = useRef<HTMLDivElement>(null)
  const panelProbe = useRef<HTMLDivElement>(null)
  const showSynonyms = useRef<HTMLButtonElement>(null)
  const room = useSideRoom(desk, binderCell, panelProbe, toGeometry(layout.page).width)

  const foldBinder = (next: boolean) => {
    setBinderFolded(next)
    setPreferenceCookie(BINDER_HIDDEN_COOKIE, next)
  }
  const foldSynonyms = (next: boolean) => {
    setSynonymsFolded(next)
    setPreferenceCookie(SYNONYMS_HIDDEN_COOKIE, next)
  }
  // Back to the button that opened them, shown at once to take the focus
  const closeOver = () => {
    flushSync(() => setSynonymsOver(false))
    showSynonyms.current?.focus()
  }
  const synonyms = synonymsPlace(room, synonymsFolded, synonymsOver)
  const over = synonyms === SynonymsPlace.Over

  const showBinder = () => foldBinder(false)
  const hideBinder = () => foldBinder(true)
  const showSynonymsPanel = () => (room ? foldSynonyms(false) : setSynonymsOver(true))
  const hideSynonymsPanel = () => (over ? closeOver() : foldSynonyms(true))

  function handleSynonymsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (over && event.key === 'Escape') closeOver()
  }

  return (
    <div ref={desk} className={styles.desk}>
      <div ref={binderCell} className={styles.binder}>
        {binderFolded ? (
          <IconButton
            label={t('binder.show')}
            icon={<BinderIcon />}
            className={styles.show}
            onClick={showBinder}
          />
        ) : (
          <BinderPanel onHide={hideBinder} />
        )}
      </div>
      <div className={styles.column}>
        <Ruler />
        {children}
      </div>
      <div className={styles.aside}>
        {/* As wide as the open panel: whether it fits is measured with it */}
        <div ref={panelProbe} className={styles.panelProbe} aria-hidden="true" />
        {synonyms === SynonymsPlace.Folded ? (
          <IconButton
            ref={showSynonyms}
            label={t('synonyms.show')}
            icon={<SynonymsIcon />}
            className={styles.show}
            onClick={showSynonymsPanel}
          />
        ) : (
          <div className={styles.synonyms} data-over={over} onKeyDown={handleSynonymsKeyDown}>
            <SynonymsPanel onHide={hideSynonymsPanel} />
          </div>
        )}
      </div>
    </div>
  )
}
