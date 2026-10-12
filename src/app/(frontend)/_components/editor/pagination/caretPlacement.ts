import { $getNearestNodeFromDOMNode } from 'lexical'

import { PageBreakNode } from '../nodes/PageBreakNode'
import { caretPoint, nearestTextOffset } from './pageGeometry'
import type { PagesOnScreen, Point } from './types'
import { clamp } from '@/lib/numbers'
import { LINE_INSET } from './constants'

// The text position under a point, with the API each engine has
export function caretFromPoint({ x, y }: Point): { node: Node; offset: number } | null {
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

// Columns share a height: locate the clicked page horizontally, then its nearest text
// rectangle. This also handles a short final page and margins outside the editable root.
// TODO: split this function, its doing too much stuff at once
export function bookCaretTarget(
  editable: HTMLElement,
  root: HTMLElement,
  click: Point,
  { page, gap, pages }: PagesOnScreen,
): Point | null {
  const box = root.getBoundingClientRect()
  const scale = box.width / parseFloat(getComputedStyle(root).width)
  const pitch = (page.width + gap) * scale
  const index = clamp(Math.floor((click.x - box.left) / pitch), 0, pages - 1)
  const left = box.left + index * pitch
  const range = document.createRange()
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let nearest: Point | null = null
  let distance = Infinity
  //TODO: remove nested if
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType !== Node.TEXT_NODE && !(node instanceof HTMLBRElement)) continue
    if (node instanceof HTMLBRElement) range.selectNode(node)
    else range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      if (!rect.height || rect.left < left || rect.left >= left + pitch) continue
      const inset = Math.min(LINE_INSET * scale, rect.width / 2)
      const point = {
        x: clamp(click.x, rect.left + inset, rect.right - inset),
        y: rect.top + rect.height / 2,
      }
      const nextDistance = Math.abs(click.y - point.y) + Math.abs(click.x - point.x)
      if (nextDistance < distance) {
        distance = nextDistance
        nearest = point
      }
    }
  }
  return nearest
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
