import { describe, expect, it } from 'vitest'

import {
  bandHeight,
  contentHeight,
  nearestTextOffset,
  pageBreakFill,
  pagesFor,
  toGeometry,
} from '@front/_components/editor/pagination/pageGeometry'

// A page 1000 px high, 100 px margins: 800 px of text, bands of 100 + 20 + 100 px
const page = { width: 600, height: 1000, top: 100, right: 80, bottom: 100, left: 80 }
const gap = 20

describe('page geometry', () => {
  it('converts millimetres to CSS pixels (A4: 210 × 297 mm)', () => {
    const a4 = toGeometry({
      format: 'A4',
      orientation: 'portrait',
      margins: { top: 25, right: 25, bottom: 25, left: 25 },
    })
    expect(a4.width).toBeCloseTo(793.7, 1)
    expect(a4.height).toBeCloseTo(1122.5, 1)
    expect(a4.top).toBeCloseTo(94.5, 1)
  })

  it('measures the text area and the band between pages', () => {
    expect(contentHeight(page)).toBe(800)
    expect(bandHeight(page, gap)).toBe(220)
  })

  it('counts the pages a flow needs, bands included', () => {
    expect(pagesFor(0, page, gap)).toBe(1)
    expect(pagesFor(800, page, gap)).toBe(1)
    expect(pagesFor(801, page, gap)).toBe(2)
    // Two text areas and one band
    expect(pagesFor(800 + 220 + 800, page, gap)).toBe(2)
    expect(pagesFor(800 + 220 + 801, page, gap)).toBe(3)
  })

  it('tolerates subpixel rounding', () => {
    expect(pagesFor(800.4, page, gap)).toBe(1)
  })

  it('fills a page break to the end of its page’s text area', () => {
    expect(pageBreakFill(300, 300, page, gap)).toBe(500)
    // On page 2 (text area from 1020 to 1820)
    expect(pageBreakFill(1500, 1500, page, gap)).toBe(320)
    // After text ending near the page's end, past the paragraph's margin: nothing to fill
    expect(pageBreakFill(795, 807, page, gap)).toBe(0)
  })

  it('takes a whole page when it follows another break', () => {
    // The previous break ended page 1's text area at 800: this one fills page 2, to 1820
    expect(pageBreakFill(800, 800, page, gap)).toBe(1020)
  })
})

describe('nearestTextOffset', () => {
  // Text areas: 100–900 on page 1, 1120–1920 on page 2 (sheets 1000 high, 20 apart)
  it('keeps a point level with a text area', () => {
    expect(nearestTextOffset(500, page, gap, 2)).toBe(500)
    expect(nearestTextOffset(1500, page, gap, 2)).toBe(1500)
  })

  it('takes a click in a margin or the gap to the nearest edge of text', () => {
    // Bottom margin of page 1: back to its last lines
    expect(nearestTextOffset(950, page, gap, 2)).toBe(898)
    // Top margin of page 2: on to its first lines
    expect(nearestTextOffset(1090, page, gap, 2)).toBe(1122)
    // Above everything, below everything
    expect(nearestTextOffset(10, page, gap, 2)).toBe(102)
    expect(nearestTextOffset(5000, page, gap, 2)).toBe(1918)
  })
})
