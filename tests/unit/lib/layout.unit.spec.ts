import { describe, expect, it } from 'vitest'

import { fitLayout, type Layout, parseLayout, toLayout } from '@/lib/layout'
import type { PageSettings } from '@/lib/pageFormats'
import { maxFirstLineIndent, withFirstLineIndent } from '@/lib/typography'

const a4: PageSettings = {
  format: 'A4',
  orientation: 'portrait',
  margins: { top: 25, right: 25, bottom: 25, left: 25 },
}
const layout: Layout = { page: a4, typography: { firstLineIndent: 0 } }

describe('first-line indent', () => {
  it('goes at most half across the text, to the half millimetre', () => {
    expect(maxFirstLineIndent(a4)).toBe((210 - 50) / 2)
    const set = (value: number) => withFirstLineIndent(layout.typography, a4, value).firstLineIndent
    expect(set(7.2)).toBe(7)
    expect(set(-3)).toBe(0)
    expect(set(500)).toBe(80)
  })
})

describe('fitLayout', () => {
  it('shrinks the indent when the text narrows', () => {
    const indented = { ...layout, typography: { firstLineIndent: 80 } }
    const fitted = fitLayout({ ...indented, page: { ...a4, format: 'A5' } })
    expect(fitted.typography.firstLineIndent).toBe((148 - 50) / 2)
  })
})

describe('toLayout', () => {
  it('starts with no first-line indent', () => {
    expect(toLayout({ page: a4 }).typography.firstLineIndent).toBe(0)
  })

  it('fits a stored layout that does not fit, so it can be saved again', () => {
    const stored = toLayout({
      page: { format: 'A5', orientation: 'portrait', margins: { left: 100, right: 100 } },
      typography: { firstLineIndent: 90 },
    })
    expect(parseLayout(stored)).toEqual(stored)
  })
})

describe('parseLayout', () => {
  it('accepts a layout that fits', () => {
    const indented = { ...layout, typography: { firstLineIndent: 10 } }
    expect(parseLayout(indented)).toEqual(indented)
  })

  it('refuses an indent beyond the text, or missing', () => {
    expect(parseLayout({ ...layout, typography: { firstLineIndent: 90 } })).toBeNull()
    expect(parseLayout({ ...layout, typography: {} })).toBeNull()
    expect(parseLayout({ page: a4 })).toBeNull()
  })
})
