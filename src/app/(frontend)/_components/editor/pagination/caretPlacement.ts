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

type BookColumn = { left: number; pitch: number; scale: number }
type TextCaret = NonNullable<ReturnType<typeof caretFromPoint>>

function caretBelongsToColumn(caret: TextCaret, column: BookColumn): boolean {
  const range = document.createRange()
  range.setStart(caret.node, caret.offset)
  range.collapse(true)
  return [...range.getClientRects()].some(
    (rect) => rect.left >= column.left && rect.left < column.left + column.pitch,
  )
}

/** Keep native line-end behavior, but reject hits that jump into a different book column. */
export function bookCaretFromPoint(
  editable: HTMLElement,
  root: HTMLElement,
  click: Point,
  pages: PagesOnScreen,
): TextCaret | null {
  const caret = caretFromPoint(click)
  const column = clickedBookColumn(root, click, pages)
  if (caret && editable.contains(caret.node) && caretBelongsToColumn(caret, column)) return caret
  const point = bookCaretTarget(editable, root, click, pages)
  return point ? caretFromPoint(point) : null
}

/** Resolve the clicked column in viewport coordinates, accounting for zoom. */
function clickedBookColumn(
  root: HTMLElement,
  click: Point,
  { page, gap, pages }: PagesOnScreen,
): BookColumn {
  const box = root.getBoundingClientRect()
  const scale = box.width / parseFloat(getComputedStyle(root).width)
  const pitch = (page.width + gap) * scale
  const index = clamp(Math.floor((click.x - box.left) / pitch), 0, pages - 1)
  return { left: box.left + index * pitch, pitch, scale }
}

/** Visit text and line-break rectangles without including unrelated element boxes. */
function* textRectangles(editable: HTMLElement): Generator<DOMRect> {
  const range = document.createRange()
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType !== Node.TEXT_NODE && !(node instanceof HTMLBRElement)) continue
    if (node instanceof HTMLBRElement) range.selectNode(node)
    else range.selectNodeContents(node)
    yield* range.getClientRects()
  }
}

function caretInColumn(
  rect: DOMRect,
  click: Point,
  { left, pitch, scale }: BookColumn,
): Point | null {
  if (!rect.height || rect.left < left || rect.left >= left + pitch) return null
  const inset = Math.min(LINE_INSET * scale, rect.width / 2)
  return {
    x: clamp(click.x, rect.left + inset, rect.right - inset),
    y: rect.top + rect.height / 2,
  }
}

type TextLine = { top: number; bottom: number; end: number }

function lastTextLine(previous: TextLine | null, rect: DOMRect, scale: number): TextLine {
  const end = rect.right - Math.min(LINE_INSET * scale, rect.width / 2)
  if (previous && rect.bottom <= previous.top) return previous
  if (previous && rect.top < previous.bottom)
    return {
      top: Math.min(previous.top, rect.top),
      bottom: Math.max(previous.bottom, rect.bottom),
      end: Math.max(previous.end, end),
    }
  return { top: rect.top, bottom: rect.bottom, end }
}

/** Find the nearest text point within the clicked book page, including a short final page. */
export function bookCaretTarget(
  editable: HTMLElement,
  root: HTMLElement,
  click: Point,
  pages: PagesOnScreen,
): Point | null {
  const column = clickedBookColumn(root, click, pages)
  let nearest: Point | null = null
  let verticalDistance = Infinity
  let horizontalDistance = Infinity
  let lastLine: TextLine | null = null
  for (const rect of textRectangles(editable)) {
    const point = caretInColumn(rect, click, column)
    if (!point) continue
    lastLine = lastTextLine(lastLine, rect, column.scale)
    const vertical = Math.abs(click.y - point.y)
    const horizontal = Math.abs(click.x - point.x)
    // Whitespace after a short line belongs to that line, rather than a longer adjacent one.
    if (vertical > verticalDistance) continue
    if (vertical === verticalDistance && horizontal >= horizontalDistance) continue
    verticalDistance = vertical
    horizontalDistance = horizontal
    nearest = point
  }
  // Dragging below all text on a short page includes its last line in full.
  if (nearest && lastLine && click.y > lastLine.bottom) nearest.x = lastLine.end
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
