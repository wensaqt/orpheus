'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { MouseEvent } from 'react'

import { isMainButton } from '@front/_components/ui/pointer'

import { PAGE_BREAK_ATTRIBUTE } from '../constants'
import { $selectTextBefore, bookCaretTarget, caretTarget, placeCaretAt } from './caretPlacement'
import type { PagesOnScreen } from './types'

/*
 * A press on a sheet that misses the text puts the caret in it, as in a word processor. The
 * margins and the gaps are outside the editable element, so no Lexical command sees them: the
 * pages listen. Returns their mousedown handler; `measure` gives the pages as laid out now.
 */
export function useCaretOnSheetClick(
  measure: (pagesRoot: HTMLElement) => PagesOnScreen,
  bookView: boolean,
) {
  const [editor] = useLexicalComposerContext()

  return function handleMouseDown(event: MouseEvent<HTMLElement>) {
    const editable = editor.getRootElement()
    const { target } = event
    if (!isMainButton(event) || !editable || !(target instanceof Element)) return
    const pageBreak = target.closest(`[${PAGE_BREAK_ATTRIBUTE}]`)
    // In the text itself, the browser and Lexical place the caret
    if (editable.contains(target) && !pageBreak) return
    // Else the browser would take the focus out of the editor
    event.preventDefault()
    if (pageBreak) {
      editable.focus({ preventScroll: true })
      editor.update(() => $selectTextBefore(pageBreak))
      return
    }
    const click = { x: event.clientX, y: event.clientY }
    const pages = measure(event.currentTarget)
    const point = bookView
      ? bookCaretTarget(editable, event.currentTarget, click, pages)
      : caretTarget(editable, click, pages)
    if (point) placeCaretAt(editable, point)
  }
}
