import { describe, expect, it } from 'vitest'

import { LINE_INSET } from '@front/_components/editor/pagination/constants'
import {
  bandHeight,
  caretPoint,
  contentHeight,
  nearestTextOffset,
  pageBreakFill,
  pagesFor,
  toGeometry,
} from '@front/_components/editor/pagination/pageGeometry'

/*
 * A page 1000 px high, 100 px margins: 800 px of text, bands of 100 + 20 + 100 px. In the
 * flow, page 1's text area spans 0–800 and page 2's 1020–1820.
 */
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
})

describe('pageBreakFill', () => {
  it('fills a page break to the end of its page’s text area', () => {
    expect(pageBreakFill({ start: 300, textEnd: 300 }, page, gap)).toBe(500)
    expect(pageBreakFill({ start: 1500, textEnd: 1500 }, page, gap)).toBe(320)
    // After text ending near the page's end, past the paragraph's margin: nothing to fill
    expect(pageBreakFill({ start: 807, textEnd: 795 }, page, gap)).toBe(0)
  })

  it('takes a whole page when it follows another break', () => {
    // The previous break ended page 1's text area at 800: this one fills page 2, to 1820
    expect(pageBreakFill({ start: 800, textEnd: 800 }, page, gap)).toBe(1020)
    // Rounded a little short of that end, it is still the next page's
    expect(pageBreakFill({ start: 799.6, textEnd: 799.6 }, page, gap)).toBeCloseTo(1020.4)
  })
})

describe('nearestTextOffset', () => {
  it('keeps a point level with a text area', () => {
    expect(nearestTextOffset(500, page, gap, 2)).toBe(500)
    expect(nearestTextOffset(1500, page, gap, 2)).toBe(1500)
  })

  it('takes a click in a margin or the gap to the nearest edge of text, just inside', () => {
    // Bottom margin of page 1: back to its last lines
    expect(nearestTextOffset(850, page, gap, 2)).toBe(800 - LINE_INSET)
    // Top margin of page 2: on to its first lines
    expect(nearestTextOffset(990, page, gap, 2)).toBe(1020 + LINE_INSET)
    // Above everything, below everything
    expect(nearestTextOffset(-90, page, gap, 2)).toBe(LINE_INSET)
    expect(nearestTextOffset(5000, page, gap, 2)).toBe(1820 - LINE_INSET)
  })
})

describe('caretPoint', () => {
  const text = { left: 100, right: 700, bottom: 900 }

  it('keeps a click inside the text', () => {
    expect(caretPoint({ x: 300, y: 400 }, text, 400)).toEqual({ x: 300, y: 400 })
  })

  it('brings a click in a side margin just inside the text, at the chosen line', () => {
    expect(caretPoint({ x: 20, y: 950 }, text, 500)).toEqual({ x: 100 + LINE_INSET, y: 500 })
    expect(caretPoint({ x: 780, y: 950 }, text, 500)).toEqual({ x: 700 - LINE_INSET, y: 500 })
  })

  it('takes a line below the text to the last line', () => {
    expect(caretPoint({ x: 300, y: 950 }, text, 950).y).toBe(900 - LINE_INSET)
  })
})
