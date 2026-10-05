// Available page formats, in millimetres (portrait). Shared by the collection and the editor.
export const PAGE_FORMATS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
} as const

export type PageFormat = keyof typeof PAGE_FORMATS
export const PAGE_ORIENTATIONS = ['portrait', 'landscape'] as const
export type PageOrientation = (typeof PAGE_ORIENTATIONS)[number]

export const DEFAULT_PAGE_FORMAT: PageFormat = 'A4'
export const DEFAULT_PAGE_MARGIN = 25

export type PageSettings = {
  format: PageFormat
  orientation: PageOrientation
  margins: { top: number; right: number; bottom: number; left: number }
  // How far the first line of each paragraph starts after the left margin
  firstLineIndent: number
}

export type PageMargin = keyof PageSettings['margins']

// Actual page dimensions for the given orientation
export const pageSize = ({ format, orientation }: Pick<PageSettings, 'format' | 'orientation'>) => {
  const { width, height } = PAGE_FORMATS[format]
  return orientation === 'landscape' ? { width: height, height: width } : { width, height }
}

type StoredPage = {
  format: PageFormat
  orientation: PageOrientation
  margins?: Partial<Record<keyof PageSettings['margins'], number | null>> | null
  firstLineIndent?: number | null
}

// A new composition's page
export const DEFAULT_PAGE: Pick<PageSettings, 'format' | 'orientation'> = {
  format: DEFAULT_PAGE_FORMAT,
  orientation: 'portrait',
}

// Normalizes stored settings (optional margins) into complete settings
export const toPageSettings = ({
  format,
  orientation,
  margins,
  firstLineIndent,
}: StoredPage): PageSettings => ({
  format,
  orientation,
  margins: {
    top: margins?.top ?? DEFAULT_PAGE_MARGIN,
    right: margins?.right ?? DEFAULT_PAGE_MARGIN,
    bottom: margins?.bottom ?? DEFAULT_PAGE_MARGIN,
    left: margins?.left ?? DEFAULT_PAGE_MARGIN,
  },
  firstLineIndent: firstLineIndent ?? 0,
})

// The smallest text area the margins may leave, across and down, in millimetres
export const MIN_TEXT_AREA = 40

// Margins are set to the half millimetre
export const MARGIN_STEP = 0.5

// The largest margin any page allows (the stored value's upper bound), in millimetres
const LONGEST_SIDE = Math.max(...Object.values(PAGE_FORMATS).map(({ height }) => height))
export const MAX_PAGE_MARGIN = LONGEST_SIDE - MIN_TEXT_AREA

// The largest first-line indent any page allows (the stored value's upper bound)
export const MAX_FIRST_LINE_INDENT = LONGEST_SIDE / 2

const OPPOSITE: Record<PageMargin, PageMargin> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

// The page's size along a margin's axis: its width for the side margins, its height otherwise
const spanOf = (settings: PageSettings, side: PageMargin) => {
  const { width, height } = pageSize(settings)
  return side === 'left' || side === 'right' ? width : height
}

const toStep = (value: number) => Math.round(value / MARGIN_STEP) * MARGIN_STEP
const floorToStep = (value: number) => Math.floor(value / MARGIN_STEP) * MARGIN_STEP

// The largest this margin can be, the opposite one kept, so the text area stays usable
export const maxMargin = (settings: PageSettings, side: PageMargin) =>
  spanOf(settings, side) - MIN_TEXT_AREA - settings.margins[OPPOSITE[side]]

// The settings with this margin set, brought within its bounds and to the step
export function withMargin(settings: PageSettings, side: PageMargin, value: number): PageSettings {
  const fitted = Math.min(Math.max(toStep(value), 0), maxMargin(settings, side))
  return fitIndent({ ...settings, margins: { ...settings.margins, [side]: fitted } })
}

// The first-line indent goes at most half across the text
export const maxFirstLineIndent = (settings: PageSettings) =>
  floorToStep((pageSize(settings).width - settings.margins.left - settings.margins.right) / 2)

// The settings with this first-line indent, brought within its bounds and to the step
export const withFirstLineIndent = (settings: PageSettings, value: number): PageSettings => ({
  ...settings,
  firstLineIndent: Math.min(Math.max(toStep(value), 0), maxFirstLineIndent(settings)),
})

// The indent shrunk if narrower text no longer has room for it
const fitIndent = (settings: PageSettings): PageSettings =>
  withFirstLineIndent(settings, settings.firstLineIndent)

/*
 * The settings with margins that fit the page, after a change of format or orientation: a
 * pair of opposite margins that leaves too little text shrinks, both in proportion
 */
export function fitMargins(settings: PageSettings): PageSettings {
  const margins = { ...settings.margins }
  for (const [first, second] of [
    ['left', 'right'],
    ['top', 'bottom'],
  ] as const) {
    const room = spanOf(settings, first) - MIN_TEXT_AREA
    const total = margins[first] + margins[second]
    if (total <= room) continue
    const scale = room / total
    margins[first] = floorToStep(margins[first] * scale)
    margins[second] = floorToStep(margins[second] * scale)
  }
  return fitIndent({ ...settings, margins })
}

const isFormat = (value: unknown): value is PageFormat =>
  typeof value === 'string' && Object.hasOwn(PAGE_FORMATS, value)

const isOrientation = (value: unknown): value is PageOrientation =>
  PAGE_ORIENTATIONS.includes(value as PageOrientation)

const MARGINS: PageMargin[] = ['top', 'right', 'bottom', 'left']

/*
 * Settings sent by a client, checked whole: a known format and orientation, margins and an
 * indent that fit
 */
export function parsePageSettings(input: unknown): PageSettings | null {
  if (typeof input !== 'object' || input === null) return null
  const { format, orientation, margins, firstLineIndent } = input as Record<string, unknown>
  if (!isFormat(format) || !isOrientation(orientation)) return null
  if (typeof firstLineIndent !== 'number' || !Number.isFinite(firstLineIndent)) return null
  if (typeof margins !== 'object' || margins === null) return null
  const values = margins as Record<string, unknown>
  if (!MARGINS.every((side) => typeof values[side] === 'number' && Number.isFinite(values[side])))
    return null
  const settings: PageSettings = {
    format,
    orientation,
    margins: {
      top: values.top as number,
      right: values.right as number,
      bottom: values.bottom as number,
      left: values.left as number,
    },
    firstLineIndent,
  }
  const fits =
    MARGINS.every((side) => settings.margins[side] >= 0) &&
    MARGINS.every((side) => settings.margins[side] <= maxMargin(settings, side)) &&
    firstLineIndent >= 0 &&
    firstLineIndent <= maxFirstLineIndent(settings)
  return fits ? settings : null
}
