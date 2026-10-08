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

// Measures the text and fits its manual breaks without changing the editor state.
export function layoutPages(
  root: HTMLElement,
  text: HTMLElement,
  page: PageGeometry,
  gap: number,
  bookView: boolean,
): number {
  if (bookView) {
    const box = root.getBoundingClientRect()
    const scale = box.width / parseFloat(getComputedStyle(root).width)
    const height = contentHeight(page)
    const columnOf = (rect: DOMRect) => {
      const x = (rect.left - box.left) / scale - page.left
      return Math.floor((x + SUBPIXEL_TOLERANCE) / (page.width + gap))
    }
    const columnOffset = (rect: DOMRect, edge: 'top' | 'bottom') =>
      columnOf(rect) * height + (rect[edge] - box.top) / scale - page.top
    // Fill the remainder of the column rather than using break-after: column, which
    // Firefox does not implement. Keep consecutive breaks as whole blank pages.
    const breaks = text.querySelectorAll<HTMLElement>(`[${PAGE_BREAK_ATTRIBUTE}]`)
    // A previous vertical layout's taller break can move itself into another column.
    for (const pageBreak of breaks) setHeight(pageBreak, '0px')
    for (const pageBreak of breaks) {
      const startRect = pageBreak.getClientRects()[0]
      if (!startRect) continue
      const previous = pageBreak.previousElementSibling
      const rects = previous?.getClientRects()
      const before = rects?.[rects.length - 1]
      const start = columnOffset(startRect, 'top')
      const textEnd = before ? columnOffset(before, 'bottom') : start
      // A consecutive break always leaves a whole blank column. Rounded rectangles
      // near the previous column's bottom cannot reliably identify that boundary.
      const fill = previous?.hasAttribute(PAGE_BREAK_ATTRIBUTE)
        ? height - SUBPIXEL_TOLERANCE
        : columnBreakFill({ start, textEnd }, page)
      setHeight(pageBreak, `${fill.toFixed(HEIGHT_DECIMALS)}px`)
    }
    // Engines disagree about scrollWidth for overflowing editable columns. Fragment
    // rectangles describe the actual occupied columns, including empty paragraphs.
    const range = document.createRange()
    range.selectNodeContents(text)
    let lastColumn = 0
    for (const rect of range.getClientRects()) {
      if (!rect.height) continue
      lastColumn = Math.max(lastColumn, columnOf(rect))
    }
    return lastColumn + 1
  }
  const offsetOf: ToFlowOffset = (y) => y - flowTopOnScreen(root, page)
  fitPageBreaks(text, offsetOf, page, gap)
  return pagesFor(offsetOf(text.getBoundingClientRect().bottom), page, gap)
}
