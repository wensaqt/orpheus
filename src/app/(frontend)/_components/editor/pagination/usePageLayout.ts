'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { LexicalEditor } from 'lexical'
import { type RefObject, useEffect, useEffectEvent, useState } from 'react'
import { flushSync } from 'react-dom'

import type { PageGeometry } from './types'
import { layoutPages } from './pageLayout'

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
 * Screen columns and the vertical print flow both use the same editable content.
 */
export function usePageLayout(
  // The pages' root: its top is the first sheet's
  pagesRef: RefObject<HTMLElement | null>,
  // The gap between sheets, in pixels, as drawn right now
  measureGap: () => number,
  page: PageGeometry,
  bookView: boolean,
) {
  const [editor] = useLexicalComposerContext()
  const [pages, setPages] = useState(1)

  const layout = useEffectEvent((text: HTMLElement) => {
    const root = pagesRef.current
    if (!root) return
    setPages(
      layoutPages(root, text, page, measureGap(), bookView && !window.matchMedia('print').matches),
    )
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
        // Print returns to the vertical flow. Fit breaks and refresh the bands before the
        // browser captures it; a second pass uses the resulting number of bands.
        const beforePrint = () => {
          flushSync(() => layout(text))
          flushSync(() => layout(text))
        }
        const media = window.matchMedia('print')
        media.addEventListener('change', frame.schedule)
        window.addEventListener('beforeprint', beforePrint)
        window.addEventListener('afterprint', frame.schedule)
        window.addEventListener('resize', frame.schedule)
        return () => {
          frame.cancel()
          stopWatching()
          media.removeEventListener('change', frame.schedule)
          window.removeEventListener('beforeprint', beforePrint)
          window.removeEventListener('afterprint', frame.schedule)
          window.removeEventListener('resize', frame.schedule)
        }
      }),
    [editor, page.width, page.height, page.top, page.right, page.bottom, page.left, bookView],
  )

  return pages
}
