'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type CSSProperties, type MouseEvent, type ReactNode, useRef } from 'react'

import { type PageSettings, pageSize } from '@/lib/pageFormats'

import styles from './PagedSheet.module.css'
import { caretTarget, placeCaretAt } from './caretPlacement'
import { bandHeight, contentHeight, toGeometry } from './pageGeometry'
import { usePageLayout } from './usePageLayout'

/*
 * The document on real pages of its format. The text stays one flow (one editor, native
 * caret and selection across pages); before it, a layer of floats takes the band between two
 * pages' text areas, so every line that reaches the end of a page continues on the next one.
 * Sheets are drawn behind. Print uses the same layout with no gap between pages.
 */
export function PagedSheet({
  settings,
  children,
}: {
  settings: PageSettings
  children: ReactNode
}) {
  const [editor] = useLexicalComposerContext()
  const page = toGeometry(settings)
  const root = useRef<HTMLDivElement>(null)
  const gapProbe = useRef<HTMLDivElement>(null)
  // Measured, not parsed: the gap is a token in rem on screen, and 0 in print
  const measureGap = () => gapProbe.current?.getBoundingClientRect().height ?? 0
  const pages = usePageLayout(root, measureGap, page)
  const { width, height } = page

  // A click on a sheet that misses the text puts the caret on the nearest line
  function onMouseDown(event: MouseEvent<HTMLDivElement>) {
    const editable = editor.getRootElement()
    if (event.button !== 0 || !editable) return
    const point = caretTarget(
      editable,
      event.target as Element,
      { x: event.clientX, y: event.clientY },
      { top: event.currentTarget.getBoundingClientRect().top, page, gap: measureGap(), pages },
    )
    if (!point) return
    // Else the browser would take the focus out of the editor
    event.preventDefault()
    placeCaretAt(editable, point)
  }

  const style = {
    '--page-w': `${width}px`,
    '--page-h': `${height}px`,
    '--page-content-h': `${contentHeight(page)}px`,
    '--page-band-base': `${bandHeight(page, 0)}px`,
    '--page-padding': `${page.top}px ${page.right}px ${page.bottom}px ${page.left}px`,
    '--pages': pages,
  } as CSSProperties
  const paper = pageSize(settings)

  return (
    <div
      ref={root}
      className={styles.paged}
      style={style}
      data-pages={pages}
      onMouseDown={onMouseDown}
    >
      {/* Printed at the composition's format, edge to edge: margins are the pages' own */}
      <style>{`@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }`}</style>
      <div ref={gapProbe} className={styles.gapProbe} aria-hidden="true" />
      <div className={styles.sheets} aria-hidden="true">
        {Array.from({ length: pages }, (_, index) => (
          <div key={index} className={styles.sheet} style={{ '--index': index } as CSSProperties} />
        ))}
      </div>
      <div className={styles.flow}>
        <div className={styles.bands} aria-hidden="true" contentEditable={false}>
          {Array.from({ length: pages - 1 }, (_, index) => (
            <span key={index} className={styles.boundary}>
              <span className={styles.textArea} />
              <span className={styles.band} />
            </span>
          ))}
        </div>
        <div className={styles.text}>{children}</div>
      </div>
    </div>
  )
}
