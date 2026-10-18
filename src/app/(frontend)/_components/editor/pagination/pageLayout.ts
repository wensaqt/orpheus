import { PAGE_BREAK_ATTRIBUTE } from '../constants'
import { contentHeight, columnBreakFill, pageBreakFill, pagesFor } from './pageGeometry'
import type { PageBreakPlace, PageGeometry } from './types'
import { SUBPIXEL_TOLERANCE } from './constants'

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

type ColumnCoordinates = {
  columnOf: (rect: DOMRect) => number
  offsetOf: (rect: DOMRect, edge: 'top' | 'bottom') => number
}

function columnCoordinates(root: HTMLElement, page: PageGeometry, gap: number): ColumnCoordinates {
  const box = root.getBoundingClientRect()
  const scale = box.width / parseFloat(getComputedStyle(root).width)
  const columnOf = (rect: DOMRect) =>
    Math.floor(
      ((rect.left - box.left) / scale - page.left + SUBPIXEL_TOLERANCE) / (page.width + gap),
    )
  const offsetOf = (rect: DOMRect, edge: 'top' | 'bottom') =>
    columnOf(rect) * contentHeight(page) + (rect[edge] - box.top) / scale - page.top
  return { columnOf, offsetOf }
}

function lastFragment(element: Element | null): DOMRect | undefined {
  const rects = element?.getClientRects()
  return rects?.[rects.length - 1]
}

function bookBreakHeight(
  pageBreak: HTMLElement,
  coordinates: ColumnCoordinates,
  page: PageGeometry,
): number | null {
  const startRect = pageBreak.getClientRects()[0]
  if (!startRect) return null
  const previous = pageBreak.previousElementSibling
  const before = lastFragment(previous)
  const start = coordinates.offsetOf(startRect, 'top')
  const textEnd = before ? coordinates.offsetOf(before, 'bottom') : start
  return previous?.hasAttribute(PAGE_BREAK_ATTRIBUTE)
    ? contentHeight(page) - SUBPIXEL_TOLERANCE
    : columnBreakFill({ start, textEnd }, page)
}

function fitBookPageBreaks(
  text: HTMLElement,
  coordinates: ColumnCoordinates,
  page: PageGeometry,
): void {
  const breaks = text.querySelectorAll<HTMLElement>(`[${PAGE_BREAK_ATTRIBUTE}]`)
  // Reset the previous vertical layout before measuring fragmented columns.
  for (const pageBreak of breaks) setHeight(pageBreak, '0px')
  for (const pageBreak of breaks) {
    const fill = bookBreakHeight(pageBreak, coordinates, page)
    if (fill !== null) setHeight(pageBreak, `${fill.toFixed(HEIGHT_DECIMALS)}px`)
  }
}

function occupiedColumns(text: HTMLElement, coordinates: ColumnCoordinates): number {
  const range = document.createRange()
  range.selectNodeContents(text)
  // Fragment rectangles are reliable where engines disagree about editable scrollWidth.
  const columns = Array.from(range.getClientRects())
    .filter((rect) => rect.height)
    .map(coordinates.columnOf)
  return columns.reduce((last, column) => Math.max(last, column), 0) + 1
}

function layoutBookPages(
  root: HTMLElement,
  text: HTMLElement,
  page: PageGeometry,
  gap: number,
): number {
  const coordinates = columnCoordinates(root, page, gap)
  fitBookPageBreaks(text, coordinates, page)
  return occupiedColumns(text, coordinates)
}

// Measures the text and fits its manual breaks without changing the editor state.
export function layoutPages(
  root: HTMLElement,
  text: HTMLElement,
  page: PageGeometry,
  gap: number,
  bookView: boolean,
): number {
  if (bookView) return layoutBookPages(root, text, page, gap)
  const offsetOf: ToFlowOffset = (y) => y - flowTopOnScreen(root, page)
  fitPageBreaks(text, offsetOf, page, gap)
  return pagesFor(offsetOf(text.getBoundingClientRect().bottom), page, gap)
}

// Page-break nodes remain in Lexical; only their computed paper heights are discarded.
export function clearPageBreakHeights(text: HTMLElement) {
  for (const pageBreak of text.querySelectorAll<HTMLElement>(`[${PAGE_BREAK_ATTRIBUTE}]`)) {
    pageBreak.style.removeProperty('height')
  }
}
