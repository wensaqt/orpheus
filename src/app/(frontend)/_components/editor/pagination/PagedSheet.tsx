'use client'

import { type CSSProperties, type ReactNode, useRef } from 'react'

import { type PageSettings, pageSize } from '@/lib/pageFormats'
import type { Typography } from '@/lib/typography'

import { classNames } from '@front/_lib/classNames'

import { MM_TO_PX, PAGE_SHEET_ATTRIBUTE, PAGES_ATTRIBUTE } from './constants'
import styles from './PagedSheet.module.css'
import { bandHeight, contentHeight, toGeometry } from './pageGeometry'
import paper from './paper.module.css'
import type { PageGeometry } from './types'
import { useCaretOnSheetClick } from './useCaretOnSheetClick'
import { flowTopOnScreen, usePageLayout } from './usePageLayout'

type PagedSheetProps = {
  settings: PageSettings
  // How the text is set on the pages (the first-line indent)
  typography: Typography
  children: ReactNode
}

/*
 * The document on real pages of its format. The text stays one flow (one editor, native
 * caret and selection across pages); before it, a layer of floats takes the band between two
 * pages' text areas, so every line that reaches the end of a page continues on the next one.
 * Sheets are drawn behind. Print uses the same layout with no gap between pages.
 */
export function PagedSheet({ settings, typography, children }: PagedSheetProps) {
  const page = toGeometry(settings)
  const root = useRef<HTMLDivElement>(null)
  const gapProbe = useRef<HTMLDivElement>(null)
  // Measured, not parsed: the gap is a token in rem on screen, and 0 in print
  const measureGap = () => gapProbe.current?.getBoundingClientRect().height ?? 0
  const pages = usePageLayout(root, measureGap, page)
  const handleMouseDown = useCaretOnSheetClick((pagesRoot) => ({
    flowTop: flowTopOnScreen(pagesRoot, page),
    page,
    gap: measureGap(),
    pages,
  }))

  return (
    <div
      ref={root}
      className={styles.paged}
      style={pagesStyle(page, typography, pages)}
      {...{ [PAGES_ATTRIBUTE]: pages }}
      onMouseDown={handleMouseDown}
    >
      <PrintedPageSize settings={settings} />
      <div ref={gapProbe} className={styles.gapProbe} aria-hidden="true" />
      <Sheets pages={pages} />
      <div className={styles.flow}>
        <PageBands pages={pages} />
        <div className={styles.text}>{children}</div>
      </div>
    </div>
  )
}

// The sizes the pages' CSS reads, in pixels
const pagesStyle = (page: PageGeometry, typography: Typography, pages: number): CSSProperties => ({
  '--page-w': `${page.width}px`,
  '--page-h': `${page.height}px`,
  '--page-content-h': `${contentHeight(page)}px`,
  '--page-band-base': `${bandHeight(page, 0)}px`,
  '--page-padding': `${page.top}px ${page.right}px ${page.bottom}px ${page.left}px`,
  // Read by the paragraphs of the text (see the editor's theme)
  '--first-line-indent': `${typography.firstLineIndent * MM_TO_PX}px`,
  '--pages': pages,
})

// Printed at the composition's format, edge to edge: margins are the pages' own
function PrintedPageSize({ settings }: { settings: PageSettings }) {
  const paperSize = pageSize(settings)
  return <style>{`@page { size: ${paperSize.width}mm ${paperSize.height}mm; margin: 0; }`}</style>
}

// The sheets of paper, drawn behind the text
function Sheets({ pages }: { pages: number }) {
  return (
    <div className={styles.sheets} aria-hidden="true">
      {Array.from({ length: pages }, (_, index) => (
        <div
          key={index}
          className={classNames(paper.paper, styles.sheet)}
          style={{ '--index': index }}
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
