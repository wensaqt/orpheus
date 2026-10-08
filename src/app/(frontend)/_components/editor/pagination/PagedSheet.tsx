'use client'

import { type CSSProperties, type ReactNode, useCallback, useRef } from 'react'

import { type PageSettings, pageSize } from '@/lib/pageFormats'
import type { Typography } from '@/lib/typography'

import { classNames } from '@front/_lib/classNames'

import { MM_TO_PX, PAGE_SHEET_ATTRIBUTE, PAGES_ATTRIBUTE } from './constants'
import styles from './PagedSheet.module.css'
import { bandHeight, contentHeight, toGeometry } from './pageGeometry'
import paper from './paper.module.css'
import type { PageGeometry } from './types'
import { useCaretOnSheetClick } from './useCaretOnSheetClick'
import { usePageLayout } from './usePageLayout'
import { flowTopOnScreen } from './pageLayout'
import { useBookFlow } from './useBookFlow'

const BOOK_SELECTION_STYLE =
  '::highlight(orpheus-book-selection) { background-color: Highlight; color: HighlightText; }'

type PagedSheetProps = {
  settings: PageSettings
  // How the text is set on the pages (the first-line indent)
  typography: Typography
  bookView: boolean
  children: ReactNode
}

/*
 * The document on real pages of its format. The text stays one flow (one editor, native
 * caret and selection across pages); before it, a layer of floats takes the band between two
 * pages' text areas, so every line that reaches the end of a page continues on the next one.
 * Sheets are drawn behind. Print uses the same layout with no gap between pages.
 */
export function PagedSheet({ settings, typography, bookView, children }: PagedSheetProps) {
  const page = toGeometry(settings)
  const root = useRef<HTMLDivElement>(null)
  const gapProbe = useRef<HTMLDivElement>(null)
  // Measured, not parsed: the gap is a token in rem on screen, and 0 in print
  const measureGap = useCallback(() => {
    const probe = gapProbe.current
    return probe ? parseFloat(getComputedStyle(probe).height) : 0
  }, [])
  const pages = usePageLayout(root, measureGap, page, bookView)
  const { stack, viewport, active, startSelection, handleCopyMouseDown } = useBookFlow(
    root,
    page,
    measureGap,
    pages,
    bookView,
  )
  const handleMouseDown = useCaretOnSheetClick(
    (pagesRoot) => ({
      flowTop: flowTopOnScreen(pagesRoot, page),
      page,
      gap: measureGap(),
      pages,
    }),
    bookView,
  )

  return (
    <div className={styles.reader} data-book={bookView} style={pagesStyle(page, typography, pages)}>
      <div ref={stack} className={styles.stack} onMouseDownCapture={startSelection}>
        {bookView && <Sheets pages={pages} bookView />}
        {bookView &&
          Array.from({ length: Math.ceil(pages / 2) }, (_, index) => (
            <div
              key={index}
              className={styles.copy}
              data-book-spread={index}
              data-active={index === active}
              style={{ '--row': index }}
              aria-hidden="true"
              onMouseDown={(event) => handleCopyMouseDown(event, index)}
            />
          ))}
        <div
          ref={viewport}
          className={styles.viewport}
          data-book-viewport={bookView ? '' : undefined}
        >
          <div
            ref={root}
            className={styles.paged}
            {...{ [PAGES_ATTRIBUTE]: pages }}
            onMouseDown={handleMouseDown}
          >
            <PrintedPageSize settings={settings} />
            {bookView && <style>{BOOK_SELECTION_STYLE}</style>}
            <div ref={gapProbe} className={styles.gapProbe} aria-hidden="true" />
            {!bookView && <Sheets pages={pages} bookView={false} />}
            <div className={styles.flow}>
              <PageBands pages={pages} />
              <div className={styles.text}>{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// The sizes the pages' CSS reads, in pixels
const pagesStyle = (page: PageGeometry, typography: Typography, pages: number): CSSProperties => ({
  '--page-w': `${page.width}px`,
  '--page-h': `${page.height}px`,
  '--page-content-h': `${contentHeight(page)}px`,
  '--page-content-w': `${page.width - page.left - page.right}px`,
  '--page-side-margins': `${page.left + page.right}px`,
  '--page-band-base': `${bandHeight(page, 0)}px`,
  '--page-padding': `${page.top}px ${page.right}px ${page.bottom}px ${page.left}px`,
  // Read by the paragraphs of the text (see the editor's theme)
  '--first-line-indent': `${typography.firstLineIndent * MM_TO_PX}px`,
  '--pages': pages,
  '--book-pages': Math.ceil(pages / 2) * 2,
  '--spreads': Math.ceil(pages / 2),
})

// Printed at the composition's format, edge to edge: margins are the pages' own
function PrintedPageSize({ settings }: { settings: PageSettings }) {
  const paperSize = pageSize(settings)
  return <style>{`@page { size: ${paperSize.width}mm ${paperSize.height}mm; margin: 0; }`}</style>
}

// The sheets of paper, drawn behind the text
function Sheets({ pages, bookView }: { pages: number; bookView: boolean }) {
  return (
    <div className={styles.sheets} aria-hidden="true">
      {Array.from({ length: bookView ? Math.ceil(pages / 2) * 2 : pages }, (_, index) => (
        <div
          key={index}
          className={classNames(paper.paper, styles.sheet, index >= pages && styles.blank)}
          style={{ '--index': index, '--column': index % 2, '--row': Math.floor(index / 2) }}
          {...{ [PAGE_SHEET_ATTRIBUTE]: '' }}
        />
      ))}
    </div>
  )
}

// Between two pages, a float that pushes the lines reaching it onto the next page
function PageBands({ pages }: { pages: number }) {
  return (
    <div className={styles.bands} aria-hidden="true" contentEditable={false}>
      {Array.from({ length: pages - 1 }, (_, index) => (
        <span key={index} className={styles.boundary}>
          <span className={styles.textArea} />
          <span className={styles.band} />
        </span>
      ))}
    </div>
  )
}
