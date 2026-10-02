'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type RefObject, useEffect, useEffectEvent, useState } from 'react'

import { PAGE_BREAK_ATTRIBUTE } from '../nodes/PageBreakNode'
import { pageBreakFill, type PageGeometry, pagesFor } from './pageGeometry'

/*
 * Lays the text out on pages: how many pages the text needs, and how tall each manual page
 * break must be to end its page. Reads the DOM after layout changes (text, fonts, settings),
 * writes only DOM styles and its own page count: the editor state is never touched, so typing
 * costs the same as without pages.
 *
 * Print needs no second pass: without the gap, every band and every offset before a break
 * shrinks by the same amount, so the breaks and the page count stay the same.
 */
export function usePageLayout(
  // The pages: their top is the first sheet's
  pagesRef: RefObject<HTMLElement | null>,
  // The gap between sheets, in pixels, as drawn right now
  measureGap: () => number,
  page: PageGeometry,
) {
  const [editor] = useLexicalComposerContext()
  const [pages, setPages] = useState(1)

  const layout = useEffectEvent(() => {
    const root = pagesRef.current
    const text = editor.getRootElement()
    if (!root || !text) return
    const gap = measureGap()
    /*
     * Offsets count from the top of the first text area. Read again at each measure: a break
     * that grows can make the browser scroll (to keep what the writer sees in place), which
     * moves everything on screen.
     */
    const offsetOf = (y: number) => y - (root.getBoundingClientRect().top + page.top)
    // Top to bottom: a break's place depends only on what comes before it, breaks included
    for (const pageBreak of text.querySelectorAll<HTMLElement>(`[${PAGE_BREAK_ATTRIBUTE}]`)) {
      const bounds = pageBreak.getBoundingClientRect()
      const offset = offsetOf(bounds.top)
      const before = pageBreak.previousElementSibling
      const after = before ? offsetOf(before.getBoundingClientRect().bottom) : offset
      const height = pageBreakFill(after, offset, page, gap)
      // Unchanged breaks are left alone: each write would cost the next read a full layout
      if (Math.abs(bounds.height - height) > 0.01) pageBreak.style.height = `${height}px`
    }
    setPages(pagesFor(offsetOf(text.getBoundingClientRect().bottom), page, gap))
  })

  useEffect(() => {
    const text = editor.getRootElement()
    if (!text) return
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Mid-composition (an accent being typed): the text it produces schedules a layout
        if (!editor.isComposing()) layout()
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
  }, [editor, pagesRef, page.width, page.height, page.top, page.right, page.bottom, page.left])

  return pages
}
