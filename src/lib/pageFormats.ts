import { clamp, finite } from './numbers'
import { isOneOf, isRecord } from './guards'

// The formats offered, in their order. Shared by the collection and the editor.
export const PAGE_FORMAT_NAMES = ['A4', 'A5'] as const
export type PageFormat = (typeof PAGE_FORMAT_NAMES)[number]

// Their sizes, in millimetres (portrait)
export const PAGE_FORMATS: Record<PageFormat, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
}

export const PAGE_ORIENTATIONS = ['portrait'] as const
export type PageOrientation = (typeof PAGE_ORIENTATIONS)[number]

export const DEFAULT_PAGE_FORMAT: PageFormat = 'A4'
export const DEFAULT_PAGE_MARGIN = 25

export type PageSettings = {
  format: PageFormat
  orientation: PageOrientation
  margins: { top: number; right: number; bottom: number; left: number }
}

export type PageMargin = keyof PageSettings['margins']

// Page dimensions in portrait
export const pageSize = ({ format }: Pick<PageSettings, 'format' | 'orientation'>) =>
  PAGE_FORMATS[format]

export type StoredPage = {
  // Previous documents may still carry the retired formats until migrated.
  format: PageFormat | 'Letter'
  orientation: PageOrientation | 'landscape'
  margins?: Partial<Record<PageMargin, number | null>> | null
}

// A new composition's page
export const DEFAULT_PAGE: Pick<PageSettings, 'format' | 'orientation'> = {
  format: DEFAULT_PAGE_FORMAT,
  orientation: 'portrait',
}

// The smallest text area the margins may leave, across and down, in millimetres
export const MIN_TEXT_AREA = 40

// Margins (and indents) are set to the half millimetre
export const MARGIN_STEP = 0.5

// The longest side of any format offered
export const LONGEST_PAGE_SIDE = Math.max(
  ...Object.values(PAGE_FORMATS).map(({ height }) => height),
)

// The largest margin any page allows (the stored value's upper bound), in millimetres
export const MAX_PAGE_MARGIN = LONGEST_PAGE_SIDE - MIN_TEXT_AREA

export const toStep = (value: number) => Math.round(value / MARGIN_STEP) * MARGIN_STEP
export const floorToStep = (value: number) => Math.floor(value / MARGIN_STEP) * MARGIN_STEP

const MARGINS: PageMargin[] = ['top', 'right', 'bottom', 'left']

const OPPOSITE: Record<PageMargin, PageMargin> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

// The page's size along a margin's axis: its width for the side margins, its height otherwise
const spanOf = (page: PageSettings, side: PageMargin) => {
  const { width, height } = pageSize(page)
  return side === 'left' || side === 'right' ? width : height
}

// The width of the text between the side margins
export const textWidth = (page: PageSettings) =>
  pageSize(page).width - page.margins.left - page.margins.right

// The largest this margin can be, the opposite one kept, so the text area stays usable
export const maxMargin = (page: PageSettings, side: PageMargin) =>
  spanOf(page, side) - MIN_TEXT_AREA - page.margins[OPPOSITE[side]]

// The page with this margin set, brought within its bounds and to the step
export function withMargin(page: PageSettings, side: PageMargin, value: number): PageSettings {
  const fitted = clamp(toStep(value), 0, maxMargin(page, side))
  return { ...page, margins: { ...page.margins, [side]: fitted } }
}

/*
 * The page with margins that fit it (after a change of format, or as stored):
 * none below zero, and a pair of opposite margins that leaves too little text shrinks, both in
 * proportion
 */
export function fitMargins(page: PageSettings): PageSettings {
  const margins = { ...page.margins }
  for (const side of MARGINS) margins[side] = Math.max(0, margins[side])
  for (const [first, second] of [
    ['left', 'right'],
    ['top', 'bottom'],
  ] as const) {
    const room = spanOf(page, first) - MIN_TEXT_AREA
    const total = margins[first] + margins[second]
    if (total <= room) continue
    const scale = room / total
    margins[first] = floorToStep(margins[first] * scale)
    margins[second] = floorToStep(margins[second] * scale)
  }
  return { ...page, margins }
}

// Stored settings (optional margins) made complete, and fitted to the page
export const toPageSettings = ({ format, margins }: StoredPage): PageSettings =>
  fitMargins({
    format: format === 'Letter' ? DEFAULT_PAGE_FORMAT : format,
    orientation: 'portrait',
    margins: {
      top: margins?.top ?? DEFAULT_PAGE_MARGIN,
      right: margins?.right ?? DEFAULT_PAGE_MARGIN,
      bottom: margins?.bottom ?? DEFAULT_PAGE_MARGIN,
      left: margins?.left ?? DEFAULT_PAGE_MARGIN,
    },
  })

const isFormat = (value: unknown): value is PageFormat => isOneOf(PAGE_FORMAT_NAMES, value)

const isOrientation = (value: unknown): value is PageOrientation =>
  isOneOf(PAGE_ORIENTATIONS, value)

// A page sent by a client, checked whole: a known format and orientation, margins that fit
export function parsePageSettings(input: unknown): PageSettings | null {
  if (!isRecord(input)) return null
  const { format, orientation, margins } = input
  if (!isFormat(format) || !isOrientation(orientation) || !isRecord(margins)) return null
  const [top, right, bottom, left] = MARGINS.map((side) => finite(margins[side]))
  if (top === null || right === null || bottom === null || left === null) return null
  const page: PageSettings = { format, orientation, margins: { top, right, bottom, left } }
  const fits = MARGINS.every(
    (side) => page.margins[side] >= 0 && page.margins[side] <= maxMargin(page, side),
  )
  return fits ? page : null
}
