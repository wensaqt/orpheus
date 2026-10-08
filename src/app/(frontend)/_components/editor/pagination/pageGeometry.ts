import { clamp } from '@/lib/numbers'
import { type PageSettings, pageSize } from '@/lib/pageFormats'

import { LINE_INSET, MM_TO_PX, SUBPIXEL_TOLERANCE } from './constants'
import type { PageBreakPlace, PageGeometry, Point } from './types'

/*
 * Page geometry in CSS pixels, for laying the text out on pages. Pure: the layout reads the
 * DOM, these functions only compute. Offsets are in the text flow: from the top of the first
 * page's text area (its sheet's top plus the top margin), bands between pages included, so
 * page n's text area spans n × pitch to n × pitch + its content height.
 */

export function toGeometry(
  settings: Pick<PageSettings, 'format' | 'orientation' | 'margins'>,
): PageGeometry {
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

/*
 * Pages needed for a text flow of this height. The flow already includes the bands between
 * the pages shown, which is consistent: N pages hold N text areas and N - 1 bands.
 */
export function pagesFor(flowHeight: number, page: PageGeometry, gap: number): number {
  const band = bandHeight(page, gap)
  return Math.max(1, Math.ceil((flowHeight - SUBPIXEL_TOLERANCE + band) / pitch(page, gap)))
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
  const areaEnd = (index: number) => index * period + contentHeight(page)
  const index = Math.floor(textEnd / period)
  // Text that ends past its text area (in the band, or right at its end) has no room left there
  const breakPage = textEnd > areaEnd(index) - SUBPIXEL_TOLERANCE ? index + 1 : index
  return Math.max(0, areaEnd(breakPage) - start)
}

// Columns have no vertical band. Leave subpixel room so an unbreakable filler fits in
// the intended column despite engine rounding; it still leaves no room for another line.
export function columnBreakFill({ start, textEnd }: PageBreakPlace, page: PageGeometry): number {
  const height = contentHeight(page)
  const end = (Math.floor((textEnd + SUBPIXEL_TOLERANCE) / height) + 1) * height
  return Math.min(height - SUBPIXEL_TOLERANCE, Math.max(0, end - start - SUBPIXEL_TOLERANCE))
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
  // The point of a page's text area nearest to the offset, just inside it
  const onPage = (index: number) => {
    const start = index * period
    return clamp(offset, start + LINE_INSET, start + contentHeight(page) - LINE_INSET)
  }
  const index = clamp(Math.floor(offset / period), 0, pages - 1)
  const here = onPage(index)
  // Level with that page's text area, above it, or below the last page: nothing is nearer
  if (here >= offset || index === pages - 1) return here
  // In the band below it: the nearer of that page's end and the next page's start
  const next = onPage(index + 1)
  return next - offset < offset - here ? next : here
}

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
