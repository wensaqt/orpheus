import { type PageSettings, pageSize } from '@/lib/pageFormats'

/*
 * Page geometry in CSS pixels, for laying the text out on pages. Pure: the layout hook reads
 * the DOM, these functions only compute.
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

/*
 * Pages needed for a text flow of this height. The flow already includes the bands between
 * the pages shown, which is consistent: N pages hold N text areas and N - 1 bands.
 */
export function pagesFor(flowHeight: number, page: PageGeometry, gap: number): number {
  const content = contentHeight(page)
  const band = bandHeight(page, gap)
  // Half a pixel of tolerance for subpixel rounding
  return Math.max(1, Math.ceil((flowHeight - 0.5 + band) / (content + band)))
}

/*
 * Height a page break must take, starting at this offset in the flow, to end where its page's
 * text area ends: what follows it then starts on the next page. Its page is the one where the
 * text before it ends (`after`, its bottom without margins); a break right after another one
 * starts exactly at a text area's end, so it takes the whole next page, left blank.
 */
export function pageBreakFill(
  after: number,
  offset: number,
  page: PageGeometry,
  gap: number,
): number {
  const period = pitch(page, gap)
  const content = contentHeight(page)
  let pageIndex = Math.floor(after / period)
  // Half a pixel of tolerance for subpixel rounding
  if (after > pageIndex * period + content - 0.5) pageIndex++
  return Math.max(0, pageIndex * period + content - offset)
}

/*
 * Where a click outside the text (a margin, the gap between two sheets) should land: the same
 * height when it is level with a page's text area, else the nearest edge of the nearest text
 * area. Offsets are from the top of the first sheet; the result is inside a text area.
 */
export function nearestTextOffset(
  offset: number,
  page: PageGeometry,
  gap: number,
  pages: number,
): number {
  const period = pitch(page, gap)
  const content = contentHeight(page)
  // A pixel inside the text area, so the point hits a line rather than its edge
  const inset = 2
  let best = page.top + inset
  let distance = Number.POSITIVE_INFINITY
  for (let index = 0; index < pages; index++) {
    const start = index * period + page.top
    const end = start + content
    const candidate = Math.min(Math.max(offset, start + inset), end - inset)
    if (Math.abs(candidate - offset) < distance) {
      distance = Math.abs(candidate - offset)
      best = candidate
    }
  }
  return best
}
