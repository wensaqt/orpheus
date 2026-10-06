import { $getNearestNodeFromDOMNode } from 'lexical'

import { PageBreakNode } from '../nodes/PageBreakNode'
import { caretPoint, nearestTextOffset } from './pageGeometry'
import type { PagesOnScreen, Point } from './types'

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

/*
 * Where a click on a sheet that missed the text should put the caret, as in a word processor:
 * on the nearest line, at the same height if a text area is level with the click (a side
 * margin), else at the nearest edge of the nearest one (top and bottom margins, the gap
 * between sheets), and on the last line below it
 */
export function caretTarget(
  editable: HTMLElement,
  click: Point,
  { flowTop, page, gap, pages }: PagesOnScreen,
): Point {
  const lineY = flowTop + nearestTextOffset(click.y - flowTop, page, gap, pages)
  return caretPoint(click, editable.getBoundingClientRect(), lineY)
}

/*
 * For a click in the blank a page break stretches over (breaks in a row too): selects the end
 * of the text before it. Through the editor, not a point on screen: that text may be pages
 * above, out of view.
 */
export function $selectTextBefore(pageBreak: Element) {
  let node = $getNearestNodeFromDOMNode(pageBreak)?.getPreviousSibling()
  while (node instanceof PageBreakNode) node = node.getPreviousSibling()
  node?.selectEnd()
}

// Puts the caret at the text position under that point, if it is in the editor
export function placeCaretAt(editable: HTMLElement, point: Point) {
  const caret = caretFromPoint(point)
  if (!caret || !editable.contains(caret.node)) return
  editable.focus({ preventScroll: true })
  window.getSelection()?.collapse(caret.node, caret.offset)
}
