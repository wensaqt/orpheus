import { PAGE_BREAK_ATTRIBUTE } from '../nodes/PageBreakNode'
import { nearestTextOffset, type PageGeometry } from './pageGeometry'

type Point = { x: number; y: number }

// The text position under a point, with the API each engine has
function caretFromPoint({ x, y }: Point): { node: Node; offset: number } | null {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y)
    return position && { node: position.offsetNode, offset: position.offset }
  }
  // Older WebKit and Blink
  const range = document.caretRangeFromPoint?.(x, y)
  return range ? { node: range.startContainer, offset: range.startOffset } : null
}

// The pages as laid out right now: where the first sheet's top is on screen, and how many
type PagesOnScreen = { top: number; page: PageGeometry; gap: number; pages: number }

/*
 * Where a click that missed the text should put the caret, as in a word processor: on the
 * nearest line. Null when the click hit the text itself, which the browser handles.
 * - In a margin or the gap between sheets: the nearest text area, at the same height if it is
 *   level with one.
 * - Below the last line: the last line.
 * - In the blank a page break stretches over: the end of the text before it.
 */
export function caretTarget(
  editable: HTMLElement,
  target: Element,
  click: Point,
  pages: PagesOnScreen,
) {
  const pageBreak = target.closest(`[${PAGE_BREAK_ATTRIBUTE}]`)
  if (editable.contains(target) && !pageBreak) return null
  const before = pageBreak?.previousElementSibling
  // A break that opens the text has nothing before it to go to
  if (pageBreak && !before) return null
  const text = editable.getBoundingClientRect()
  const y = before
    ? before.getBoundingClientRect().bottom - 2
    : pages.top + nearestTextOffset(click.y - pages.top, pages.page, pages.gap, pages.pages)
  // A pixel inside the text, so the point hits a line rather than its edge
  return {
    x: Math.min(Math.max(click.x, text.left + 1), text.right - 1),
    y: Math.min(y, text.bottom - 1),
  }
}

// Puts the caret at the text position under that point, if it is in the editor
export function placeCaretAt(editable: HTMLElement, point: Point) {
  const caret = caretFromPoint(point)
  if (!caret || !editable.contains(caret.node)) return
  editable.focus({ preventScroll: true })
  window.getSelection()?.collapse(caret.node, caret.offset)
}
