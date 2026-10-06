import { isRecord } from './guards'
import {
  fitMargins,
  parsePageSettings,
  type PageSettings,
  type StoredPage,
  toPageSettings,
} from './pageFormats'
import { DEFAULT_TYPOGRAPHY, fitTypography, parseTypography, type Typography } from './typography'

// A composition's layout: its pages and how its text is set on them
export type Layout = { page: PageSettings; typography: Typography }

type StoredLayout = {
  page: StoredPage
  typography?: { firstLineIndent?: number | null } | null
}

// The layout fitted together: margins within their page, the text's settings within the margins
export function fitLayout({ page, typography }: Layout): Layout {
  const fitted = fitMargins(page)
  return { page: fitted, typography: fitTypography(typography, fitted) }
}

// A stored layout made complete, and fitted: what was saved may not fit (older rules, the admin)
export function toLayout({ page, typography }: StoredLayout): Layout {
  const fittedPage = toPageSettings(page)
  return {
    page: fittedPage,
    typography: fitTypography(
      {
        firstLineIndent: typography?.firstLineIndent ?? DEFAULT_TYPOGRAPHY.firstLineIndent,
      },
      fittedPage,
    ),
  }
}

// A layout sent by a client, checked whole
export function parseLayout(input: unknown): Layout | null {
  if (!isRecord(input)) return null
  const { page, typography } = input
  const parsedPage = parsePageSettings(page)
  const parsedTypography = parsedPage && parseTypography(typography, parsedPage)
  return parsedPage && parsedTypography ? { page: parsedPage, typography: parsedTypography } : null
}
