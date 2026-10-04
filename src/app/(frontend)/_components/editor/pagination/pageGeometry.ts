import { type PageSettings, pageSize } from '@/lib/pageFormats'

/*
 * Page geometry in CSS pixels, for laying the text out on pages. Pure: the layout reads the
 * DOM, these functions only compute. Offsets are in the text flow: from the top of the first
 * page's text area (its sheet's top plus the top margin), bands between pages included, so
 * page n's text area spans n × pitch to n × pitch + its content height.
 */

// CSS pixels per millimetre (96 px per inch, also what print uses)
export const MM_TO_PX = 96 / 25.4

export type PageGeometry = {
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export function toGeometry(settings: PageSettings): PageGeometry {
  const { width, height } = pageSize(settings)
  const { top, right, bottom, left } = settings.margins
  return {
    width: width * MM_TO_PX,
    height: height * MM_TO_PX,
    top: top * MM_TO_PX,
    right: right * MM_TO_PX,
    bottom: bottom * MM_TO_PX,
    left: left * MM_TO_PX,
  }
}

// Height of the text area of one page
export const contentHeight = (page: PageGeometry) => page.height - page.top - page.bottom

// Between two text areas: the bottom margin, the gap between sheets, the next top margin
export const bandHeight = (page: PageGeometry, gap: number) => page.bottom + gap + page.top

// One page's text area plus the band below it: the period of the layout
const pitch = (page: PageGeometry, gap: number) => contentHeight(page) + bandHeight(page, gap)

// Measured sizes are rounded to fractions of a pixel: within this, two of them are equal
export const SUBPIXEL_TOLERANCE = 0.5

// How far inside a text area a point must be to hit a line, rather than the area's edge
export const LINE_INSET = 2

/*
 * Pages needed for a text flow of this height. The flow already includes the bands between
 * the pages shown, which is consistent: N pages hold N text areas and N - 1 bands.
 */
export function pagesFor(flowHeight: number, page: PageGeometry, gap: number): number {
  const band = bandHeight(page, gap)
  return Math.max(1, Math.ceil((flowHeight - SUBPIXEL_TOLERANCE + band) / pitch(page, gap)))
}

// A page break in the flow: where it starts, and where the text before it ends
export type PageBreakPlace = {
  start: number
  // The bottom of the block before it, margins left out (its own start when it opens the text)
  textEnd: number
}

/*
 * Height a page break must take to end where its page's text area ends: what follows it then
 * starts on the next page. Its page is the one where the text before it ends; a break right
 * after another one starts exactly at a text area's end, so it takes the whole next page,
 * left blank.
 */
export function pageBreakFill(
  { start, textEnd }: PageBreakPlace,
  page: PageGeometry,
  gap: number,
): number {
  const period = pitch(page, gap)
  const content = contentHeight(page)
  let pageIndex = Math.floor(textEnd / period)
  if (textEnd > pageIndex * period + content - SUBPIXEL_TOLERANCE) pageIndex++
  return Math.max(0, pageIndex * period + content - start)
}

/*
 * Where a click outside the text (a margin, the gap between two sheets) should land: the same
 * height when it is level with a page's text area, else the nearest edge of the nearest text
 * area, just inside it.
 */
export function nearestTextOffset(
  offset: number,
  page: PageGeometry,
  gap: number,
  pages: number,
): number {
  const period = pitch(page, gap)
  const content = contentHeight(page)
  let best = LINE_INSET
  let distance = Number.POSITIVE_INFINITY
  for (let index = 0; index < pages; index++) {
    const start = index * period
    const candidate = clamp(offset, start + LINE_INSET, start + content - LINE_INSET)
    if (Math.abs(candidate - offset) < distance) {
      distance = Math.abs(candidate - offset)
      best = candidate
    }
  }
  return best
}

export type Point = { x: number; y: number }

/*
 * The point to put the caret at, on screen: the click's, brought inside the text's box, at
 * the height of the line chosen (`lineY`) or of the last line if that is below
 */
export function caretPoint(
  click: Point,
  text: { left: number; right: number; bottom: number },
  lineY: number,
): Point {
  return {
    x: clamp(click.x, text.left + LINE_INSET, text.right - LINE_INSET),
    y: Math.min(lineY, text.bottom - LINE_INSET),
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
