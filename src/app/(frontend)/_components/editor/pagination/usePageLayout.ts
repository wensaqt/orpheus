'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { LexicalEditor } from 'lexical'
import { type RefObject, useEffect, useEffectEvent, useState } from 'react'

import { PAGE_BREAK_ATTRIBUTE } from '../constants'
import { pageBreakFill, pagesFor } from './pageGeometry'
import type { PageBreakPlace, PageGeometry } from './types'

// A break's height is written to the hundredth of a pixel: finer would only add rewrites
const HEIGHT_DECIMALS = 2

/*
 * Where the text flow starts on screen: the first sheet's top plus its top margin. Read anew
 * at each measure: a break that grows can make the browser scroll (to keep what the writer
 * sees in place), which moves everything on screen.
 */
export const flowTopOnScreen = (root: Element, page: PageGeometry) =>
  root.getBoundingClientRect().top + page.top

// An offset in the text flow, from a height on screen
type ToFlowOffset = (y: number) => number

// Where a page break starts in the flow, and where the text before it ends
function pageBreakPlace(pageBreak: HTMLElement, offsetOf: ToFlowOffset): PageBreakPlace {
  const start = offsetOf(pageBreak.getBoundingClientRect().top)
  const before = pageBreak.previousElementSibling
  return { start, textEnd: before ? offsetOf(before.getBoundingClientRect().bottom) : start }
}

// Unchanged heights are left alone: each write would cost the next read a full layout
function setHeight(element: HTMLElement, height: string) {
  if (element.style.height !== height) element.style.height = height
}

/*
 * Stretches every page break down to its page's end. Top to bottom, measuring each break after
 * writing the ones before it: a break's place depends on them, and text moved across a page's
 * end does not move by their sum.
 */
function fitPageBreaks(text: HTMLElement, offsetOf: ToFlowOffset, page: PageGeometry, gap: number) {
  for (const pageBreak of text.querySelectorAll(`[${PAGE_BREAK_ATTRIBUTE}]`)) {
    if (!(pageBreak instanceof HTMLElement)) continue
    const fill = pageBreakFill(pageBreakPlace(pageBreak, offsetOf), page, gap)
    setHeight(pageBreak, `${fill.toFixed(HEIGHT_DECIMALS)}px`)
  }
}

// Runs the callback in the next frame, once however many times it was asked for before
function frameScheduler(callback: () => void) {
  let frame = 0
  return {
    schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(callback)
    },
    cancel: () => cancelAnimationFrame(frame),
  }
}

/*
 * Calls back whenever the text may have moved: its size changes (observing makes the observer
 * report at once), its content changes at the same height (a break moved), or its fonts arrive
 * (lines break anew). Returns the cleanup.
 */
function onTextMoves(editor: LexicalEditor, text: HTMLElement, callback: () => void) {
  const observer = new ResizeObserver(callback)
  observer.observe(text)
  const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
    if (dirtyElements.size || dirtyLeaves.size) callback()
  })
  document.fonts.addEventListener('loadingdone', callback)
  void document.fonts.ready.then(callback)
  return () => {
    observer.disconnect()
    unregister()
    document.fonts.removeEventListener('loadingdone', callback)
  }
}

/*
 * Lays the text out on pages: how many pages the text needs, and how tall each manual page
 * break must be to end its page. Reads the DOM after layout changes (text, fonts, settings)
 * and writes only DOM styles and its own page count: the editor state is never touched.
 *
 * Print needs no second pass: without the gap, every band and every offset before a break
 * shrinks by the same amount, so the breaks and the page count stay the same.
 */
export function usePageLayout(
  // The pages' root: its top is the first sheet's
  pagesRef: RefObject<HTMLElement | null>,
  // The gap between sheets, in pixels, as drawn right now
  measureGap: () => number,
  page: PageGeometry,
) {
  const [editor] = useLexicalComposerContext()
  const [pages, setPages] = useState(1)

  const layout = useEffectEvent((text: HTMLElement) => {
    const root = pagesRef.current
    if (!root) return
    const gap = measureGap()
    const offsetOf: ToFlowOffset = (y) => y - flowTopOnScreen(root, page)
    fitPageBreaks(text, offsetOf, page, gap)
    setPages(pagesFor(offsetOf(text.getBoundingClientRect().bottom), page, gap))
  })

  // New page settings re-run this effect, and observing anew lays the new pages out
  useEffect(
    () =>
      editor.registerRootListener((text) => {
        if (!text) return
        const frame = frameScheduler(() => {
          // Mid-composition (an accent being typed): the text it produces schedules a layout
          if (!editor.isComposing()) layout(text)
        })
        const stopWatching = onTextMoves(editor, text, frame.schedule)
        return () => {
          frame.cancel()
          stopWatching()
        }
      }),
    [editor, page.width, page.height, page.top, page.right, page.bottom, page.left],
  )

  return pages
}
