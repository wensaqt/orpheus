import {
  finite,
  floorToStep,
  LONGEST_PAGE_SIDE,
  type PageSettings,
  textWidth,
  toStep,
} from './pageFormats'

// How a composition's text is set (font, size and line height will join it), in millimetres
export type Typography = {
  // How far the first line of each paragraph starts after the left margin
  firstLineIndent: number
}

export const DEFAULT_TYPOGRAPHY: Typography = { firstLineIndent: 0 }

// The largest first-line indent any page allows (the stored value's upper bound)
export const MAX_FIRST_LINE_INDENT = LONGEST_PAGE_SIDE / 2

// The first-line indent goes at most half across the text
export const maxFirstLineIndent = (page: PageSettings) => floorToStep(textWidth(page) / 2)

// The typography with this first-line indent, brought within its bounds and to the step
export const withFirstLineIndent = (
  typography: Typography,
  page: PageSettings,
  value: number,
): Typography => ({
  ...typography,
  firstLineIndent: Math.min(Math.max(toStep(value), 0), maxFirstLineIndent(page)),
})

// The typography fitted to the page: the indent shrinks if narrower text has no room for it
export const fitTypography = (typography: Typography, page: PageSettings): Typography =>
  withFirstLineIndent(typography, page, typography.firstLineIndent)

// Typography sent by a client, checked against its page
export function parseTypography(input: unknown, page: PageSettings): Typography | null {
  if (typeof input !== 'object' || input === null) return null
  const firstLineIndent = finite((input as Record<string, unknown>).firstLineIndent)
  if (firstLineIndent === null) return null
  return firstLineIndent >= 0 && firstLineIndent <= maxFirstLineIndent(page)
    ? { firstLineIndent }
    : null
}
