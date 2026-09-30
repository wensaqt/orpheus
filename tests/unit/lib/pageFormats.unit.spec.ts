import { describe, expect, it } from 'vitest'

import { DEFAULT_PAGE_MARGIN, pageSize, toPageSettings } from '@/lib/pageFormats'

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

  it('accepts missing or null margins', () => {
    expect(
      toPageSettings({ format: 'A4', orientation: 'portrait', margins: null }).margins.top,
    ).toBe(DEFAULT_PAGE_MARGIN)
  })
})
