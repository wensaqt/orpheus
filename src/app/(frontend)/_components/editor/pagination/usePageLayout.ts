'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type RefObject, useEffect, useEffectEvent, useState } from 'react'

import { PAGE_BREAK_ATTRIBUTE } from '../nodes/PageBreakNode'
import { pageBreakFill, type PageGeometry, pagesFor } from './pageGeometry'

/*
 * Where the text flow starts on screen: the first sheet's top plus its top margin. Read anew
 * at each measure: a break that grows can make the browser scroll (to keep what the writer
 * sees in place), which moves everything on screen.
 */
export const flowTopOnScreen = (root: Element, page: PageGeometry) =>
  root.getBoundingClientRect().top + page.top

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
    const offsetOf = (y: number) => y - flowTopOnScreen(root, page)
    /*
     * Top to bottom, measuring each break after writing the ones before it: a break's place
     * depends on them, and text moved across a page's end does not move by their sum
     */
    for (const pageBreak of text.querySelectorAll<HTMLElement>(`[${PAGE_BREAK_ATTRIBUTE}]`)) {
      const start = offsetOf(pageBreak.getBoundingClientRect().top)
      const before = pageBreak.previousElementSibling
      const textEnd = before ? offsetOf(before.getBoundingClientRect().bottom) : start
      const height = `${pageBreakFill({ start, textEnd }, page, gap).toFixed(2)}px`
      // Unchanged breaks are left alone: each write would cost the next read a full layout
      if (pageBreak.style.height !== height) pageBreak.style.height = height
    }
    setPages(pagesFor(offsetOf(text.getBoundingClientRect().bottom), page, gap))
  })

  /*
   * Lays out again whenever the text may have moved. New page settings re-run this effect,
   * and observing anew makes the observer report at once: that lays the new pages out
   */
  useEffect(
    () =>
      editor.registerRootListener((text) => {
        if (!text) return
        let frame = 0
        const schedule = () => {
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(() => {
            // Mid-composition (an accent being typed): the text it produces schedules a layout
            if (!editor.isComposing()) layout(text)
          })
        }
        const observer = new ResizeObserver(schedule)
        observer.observe(text)
        // Text changes that keep the text's height (a break moved) still move the breaks
        const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
          if (dirtyElements.size || dirtyLeaves.size) schedule()
        })
        // Line breaks change once the text's fonts arrive
        document.fonts.addEventListener('loadingdone', schedule)
        void document.fonts.ready.then(schedule)
        return () => {
          cancelAnimationFrame(frame)
          observer.disconnect()
          unregister()
          document.fonts.removeEventListener('loadingdone', schedule)
        }
      }),
    [editor, page.width, page.height, page.top, page.right, page.bottom, page.left],
  )

  return pages
}
