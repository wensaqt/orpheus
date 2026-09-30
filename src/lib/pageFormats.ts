// Available page formats, in millimetres (portrait). Shared by the collection and the editor.
export const PAGE_FORMATS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
} as const

export type PageFormat = keyof typeof PAGE_FORMATS
export type PageOrientation = 'portrait' | 'landscape'

export const DEFAULT_PAGE_FORMAT: PageFormat = 'A4'
export const DEFAULT_PAGE_MARGIN = 25

export type PageSettings = {
  format: PageFormat
  orientation: PageOrientation
  margins: { top: number; right: number; bottom: number; left: number }
}

// Actual page dimensions for the given orientation
export const pageSize = ({ format, orientation }: Pick<PageSettings, 'format' | 'orientation'>) => {
  const { width, height } = PAGE_FORMATS[format]
  return orientation === 'landscape' ? { width: height, height: width } : { width, height }
}

type StoredPage = {
  format: PageFormat
  orientation: PageOrientation
  margins?: Partial<Record<keyof PageSettings['margins'], number | null>> | null
}

// Normalizes stored settings (optional margins) into complete settings
export const toPageSettings = ({ format, orientation, margins }: StoredPage): PageSettings => ({
  format,
  orientation,
  margins: {
    top: margins?.top ?? DEFAULT_PAGE_MARGIN,
    right: margins?.right ?? DEFAULT_PAGE_MARGIN,
    bottom: margins?.bottom ?? DEFAULT_PAGE_MARGIN,
    left: margins?.left ?? DEFAULT_PAGE_MARGIN,
  },
})
