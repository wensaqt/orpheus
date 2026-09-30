import { describe, expect, it } from 'vitest'

import {
  bentPath,
  restPath,
  STRING_BOTTOM,
  STRINGS,
  W,
  yokeY,
} from '@front/(home)/_components/LyreButton/geometry'

describe('lyre geometry', () => {
  it('the yoke peaks on the axis: strings rise towards the centre', () => {
    const tops = STRINGS.map((string) => string.top)
    expect([...tops].sort((a, b) => a - b)).toEqual(tops)
    expect(yokeY(W)).toBeLessThan(yokeY(STRINGS[STRINGS.length - 1].x))
  })

  it('the centre strings are the thickest', () => {
    const widths = STRINGS.map((string) => string.width)
    expect([...widths].sort((a, b) => b - a)).toEqual(widths)
  })

  it('a string at rest is straight, a plucked string passes through the pluck point', () => {
    const [string] = STRINGS
    expect(restPath(string)).toBe(`M ${string.x} ${string.top} L ${string.x} ${STRING_BOTTOM}`)

    // Vertex of a quadratic: (P0 + 2·C + P2) / 4, here on y = 150
    const [, cy] = bentPath(string, 8, 150).split('Q ')[1].split(' ').map(Number)
    expect((string.top + 2 * cy + STRING_BOTTOM) / 4).toBeCloseTo(150)
  })
})
