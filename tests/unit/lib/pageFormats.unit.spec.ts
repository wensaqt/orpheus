import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_MARGIN,
  fitMargins,
  maxFirstLineIndent,
  maxMargin,
  MIN_TEXT_AREA,
  pageSize,
  parsePageSettings,
  type PageSettings,
  toPageSettings,
  withFirstLineIndent,
  withMargin,
} from '@/lib/pageFormats'

const a4: PageSettings = {
  format: 'A4',
  orientation: 'portrait',
  margins: { top: 25, right: 25, bottom: 25, left: 25 },
  firstLineIndent: 0,
}

describe('pageSize', () => {
  it('returns the portrait dimensions of the format', () => {
    expect(pageSize({ format: 'A4', orientation: 'portrait' })).toEqual({ width: 210, height: 297 })
  })

  it('swaps dimensions in landscape', () => {
    expect(pageSize({ format: 'A5', orientation: 'landscape' })).toEqual({
      width: 210,
      height: 148,
    })
  })
})

describe('toPageSettings', () => {
  it('fills missing margins with the default value', () => {
    const settings = toPageSettings({ format: 'A4', orientation: 'portrait', margins: { top: 10 } })
    expect(settings.margins).toEqual({
      top: 10,
      right: DEFAULT_PAGE_MARGIN,
      bottom: DEFAULT_PAGE_MARGIN,
      left: DEFAULT_PAGE_MARGIN,
    })
  })

  it('starts with no first-line indent', () => {
    expect(toPageSettings({ format: 'A4', orientation: 'portrait' }).firstLineIndent).toBe(0)
  })

  it('accepts missing or null margins', () => {
    expect(
      toPageSettings({ format: 'A4', orientation: 'portrait', margins: null }).margins.top,
    ).toBe(DEFAULT_PAGE_MARGIN)
  })
})

describe('margins', () => {
  it('leaves at least the smallest text area, the opposite margin kept', () => {
    expect(maxMargin(a4, 'left')).toBe(210 - MIN_TEXT_AREA - 25)
    expect(maxMargin(a4, 'top')).toBe(297 - MIN_TEXT_AREA - 25)
  })

  it('sets a margin within its bounds, to the half millimetre', () => {
    expect(withMargin(a4, 'left', 31.3).margins.left).toBe(31.5)
    expect(withMargin(a4, 'left', -5).margins.left).toBe(0)
    expect(withMargin(a4, 'right', 500).margins.right).toBe(210 - MIN_TEXT_AREA - 25)
  })

  it('shrinks margins that no longer fit a smaller or turned page, in proportion', () => {
    const wide = { ...a4, margins: { top: 25, right: 60, bottom: 25, left: 60 } }
    // A5: 148 mm across, so 108 mm of margins at most
    const fitted = fitMargins({ ...wide, format: 'A5' })
    expect(fitted.margins).toEqual({ top: 25, right: 54, bottom: 25, left: 54 })
    expect(fitMargins(a4)).toEqual(a4)
  })
})

describe('parsePageSettings', () => {
  it('accepts settings whose margins fit the page', () => {
    expect(parsePageSettings(a4)).toEqual(a4)
  })

  it('refuses unknown formats, orientations and malformed margins', () => {
    expect(parsePageSettings({ ...a4, format: 'B5' })).toBeNull()
    expect(parsePageSettings({ ...a4, orientation: 'sideways' })).toBeNull()
    expect(parsePageSettings({ ...a4, margins: { ...a4.margins, top: Number.NaN } })).toBeNull()
    expect(parsePageSettings({ ...a4, margins: { ...a4.margins, left: -1 } })).toBeNull()
    expect(parsePageSettings(null)).toBeNull()
  })

  it('refuses margins that leave too little text', () => {
    expect(parsePageSettings({ ...a4, margins: { ...a4.margins, left: 150 } })).toBeNull()
  })
})

describe('first-line indent', () => {
  it('goes at most half across the text, to the half millimetre', () => {
    expect(maxFirstLineIndent(a4)).toBe((210 - 50) / 2)
    expect(withFirstLineIndent(a4, 7.2).firstLineIndent).toBe(7)
    expect(withFirstLineIndent(a4, -3).firstLineIndent).toBe(0)
    expect(withFirstLineIndent(a4, 500).firstLineIndent).toBe(80)
  })

  it('shrinks when wider margins leave less text', () => {
    const indented = withFirstLineIndent(a4, 80)
    expect(withMargin(indented, 'left', 85).firstLineIndent).toBe((210 - 85 - 25) / 2)
  })

  it('is checked with the rest of the settings', () => {
    expect(parsePageSettings({ ...a4, firstLineIndent: 10 })).toEqual({
      ...a4,
      firstLineIndent: 10,
    })
    expect(parsePageSettings({ ...a4, firstLineIndent: 90 })).toBeNull()
    expect(parsePageSettings({ ...a4, firstLineIndent: undefined })).toBeNull()
  })
})
