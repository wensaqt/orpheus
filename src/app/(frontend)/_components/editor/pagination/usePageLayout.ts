'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { LexicalEditor } from 'lexical'
import { type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import type { PageGeometry } from './types'
import { clearPageBreakHeights, layoutPages } from './pageLayout'

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
  let active = true
  const observer = new ResizeObserver(callback)
  observer.observe(text)
  const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
    if (dirtyElements.size || dirtyLeaves.size) callback()
  })
  document.fonts.addEventListener('loadingdone', callback)
  void document.fonts.ready.then(() => {
    if (active) callback()
  })
  return () => {
    active = false
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
 * Screen columns and the vertical print flow both use the same editable content.
 */
export function usePageLayout(
  // The pages' root: its top is the first sheet's
  pagesRef: RefObject<HTMLElement | null>,
  // The gap between sheets, in pixels, as drawn right now
  measureGap: () => number,
  page: PageGeometry,
  bookView: boolean,
  continuous = false,
) {
  const [editor] = useLexicalComposerContext()
  const [pages, setPages] = useState(1)
  const printing = useRef(false)

  const layout = useEffectEvent((text: HTMLElement) => {
    const root = pagesRef.current
    if (!root) return
    if (continuous && !printing.current && !window.matchMedia('print').matches) {
      clearPageBreakHeights(text)
      setPages(1)
      return
    }
    setPages(
      layoutPages(root, text, page, measureGap(), bookView && !window.matchMedia('print').matches),
    )
  })

  // New page settings re-run this effect, and observing anew lays the new pages out
  useEffect(
    () =>
      editor.registerRootListener((text) => {
        if (!text) return
        let disposed = false
        const frame = frameScheduler(() => {
          // Mid-composition (an accent being typed): the text it produces schedules a layout
          if (!disposed && !printing.current && !editor.isComposing()) layout(text)
        })
        const stopWatching = onTextMoves(editor, text, frame.schedule)
        // Print returns to the vertical flow. Fit breaks and refresh the bands before the
        // browser captures it; a second pass uses the resulting number of bands.
        const beforePrint = () => {
          if (disposed) return
          frame.cancel()
          printing.current = true
          pagesRef.current?.setAttribute('data-print-layout', '')
          flushSync(() => layout(text))
          flushSync(() => layout(text))
        }
        const afterPrint = () => {
          if (media.matches || disposed) return
          printing.current = false
          pagesRef.current?.removeAttribute('data-print-layout')
          // Clear stretched breaks before the next frame so the writing view never jumps.
          if (continuous) clearPageBreakHeights(text)
          frame.schedule()
        }
        const media = window.matchMedia('print')
        const mediaChanged = () => (media.matches ? beforePrint() : afterPrint())
        media.addEventListener('change', mediaChanged)
        window.addEventListener('beforeprint', beforePrint)
        window.addEventListener('afterprint', afterPrint)
        window.addEventListener('resize', frame.schedule)
        return () => {
          disposed = true
          printing.current = false
          pagesRef.current?.removeAttribute('data-print-layout')
          frame.cancel()
          stopWatching()
          media.removeEventListener('change', mediaChanged)
          window.removeEventListener('beforeprint', beforePrint)
          window.removeEventListener('afterprint', afterPrint)
          window.removeEventListener('resize', frame.schedule)
        }
      }),
    [
      editor,
      pagesRef,
      page.width,
      page.height,
      page.top,
      page.right,
      page.bottom,
      page.left,
      bookView,
      continuous,
    ],
  )

  return pages
}
