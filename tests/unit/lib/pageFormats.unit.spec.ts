import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_MARGIN,
  fitMargins,
  maxMargin,
  MIN_TEXT_AREA,
  pageSize,
  parsePageSettings,
  type PageSettings,
  toPageSettings,
  withMargin,
} from '@/lib/pageFormats'

const a4: PageSettings = {
  format: 'A4',
  orientation: 'portrait',
  margins: { top: 25, right: 25, bottom: 25, left: 25 },
}

describe('pageSize', () => {
  it('returns the portrait dimensions of the format', () => {
    expect(pageSize({ format: 'A4', orientation: 'portrait' })).toEqual({ width: 210, height: 297 })
  })

  it('returns A5 dimensions in portrait', () => {
    expect(pageSize({ format: 'A5', orientation: 'portrait' })).toEqual({
      width: 148,
      height: 210,
    })
  })
})

describe('toPageSettings', () => {
  it('normalizes retired formats and orientations while preserving margins', () => {
    expect(
      toPageSettings({ format: 'Letter', orientation: 'landscape', margins: { top: 10 } }),
    ).toEqual({ ...a4, margins: { ...a4.margins, top: 10 } })
    expect(toPageSettings({ format: 'A5', orientation: 'landscape' }).orientation).toBe('portrait')
  })

  it('fills missing margins with the default value', () => {
    const settings = toPageSettings({ format: 'A4', orientation: 'portrait', margins: { top: 10 } })
    expect(settings.margins).toEqual({
      top: 10,
      right: DEFAULT_PAGE_MARGIN,
      bottom: DEFAULT_PAGE_MARGIN,
      left: DEFAULT_PAGE_MARGIN,
    })
  })

  it('accepts missing or null margins', () => {
    expect(
      toPageSettings({ format: 'A4', orientation: 'portrait', margins: null }).margins.top,
    ).toBe(DEFAULT_PAGE_MARGIN)
  })

  it('fits margins stored too wide for their page', () => {
    const stored = toPageSettings({
      format: 'A5',
      orientation: 'portrait',
      margins: { left: 100, right: 100, top: -5 },
    })
    expect(stored.margins).toEqual({ top: 0, right: 54, bottom: 25, left: 54 })
    expect(parsePageSettings(stored)).toEqual(stored)
  })
})

describe('margins', () => {
  it('leave at least the smallest text area, the opposite margin kept', () => {
    expect(maxMargin(a4, 'left')).toBe(210 - MIN_TEXT_AREA - 25)
    expect(maxMargin(a4, 'top')).toBe(297 - MIN_TEXT_AREA - 25)
  })

  it('are set within their bounds, to the half millimetre', () => {
    expect(withMargin(a4, 'left', 31.3).margins.left).toBe(31.5)
    expect(withMargin(a4, 'left', -5).margins.left).toBe(0)
    expect(withMargin(a4, 'right', 500).margins.right).toBe(210 - MIN_TEXT_AREA - 25)
  })

  it('shrink in proportion when they no longer fit a smaller page', () => {
    const wide = { ...a4, margins: { top: 25, right: 60, bottom: 25, left: 60 } }
    // A5: 148 mm across, so 108 mm of margins at most
    expect(fitMargins({ ...wide, format: 'A5' }).margins).toEqual({
      top: 25,
      right: 54,
      bottom: 25,
      left: 54,
    })
    expect(fitMargins(a4)).toEqual(a4)
  })
})

describe('parsePageSettings', () => {
  it('accepts a page whose margins fit', () => {
    expect(parsePageSettings(a4)).toEqual(a4)
  })

  it('refuses unknown formats, orientations and malformed margins', () => {
    expect(parsePageSettings({ ...a4, format: 'B5' })).toBeNull()
    expect(parsePageSettings({ ...a4, format: 'Letter' })).toBeNull()
    expect(parsePageSettings({ ...a4, orientation: 'landscape' })).toBeNull()
    expect(parsePageSettings({ ...a4, orientation: 'sideways' })).toBeNull()
    expect(parsePageSettings({ ...a4, margins: { ...a4.margins, top: Number.NaN } })).toBeNull()
    expect(parsePageSettings({ ...a4, margins: { ...a4.margins, left: -1 } })).toBeNull()
    expect(parsePageSettings(null)).toBeNull()
  })

  it('refuses margins that leave too little text', () => {
    expect(parsePageSettings({ ...a4, margins: { ...a4.margins, left: 150 } })).toBeNull()
  })
})
