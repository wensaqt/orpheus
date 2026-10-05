import { describe, expect, it } from 'vitest'

import { type Box, classifyLines, lastLineOn, type Screen } from '../../helpers/pageLayout'

// The judge of the pagination e2e tests: two sheets 1000 high, 20 apart, 100 px margins
const box = (top: number, height = 20, left = 100): Box => ({
  top,
  bottom: top + height,
  left,
  width: 400,
  height,
})
const sheets = [box(0, 1000, 0), box(1020, 1000, 0)]
const margins = { top: 100, bottom: 100 }
const screen = (lines: Screen['lines']): Screen => ({
  pages: 2,
  pagesTop: 0,
  sheets,
  textRight: 600,
  lines,
})

describe('classifyLines', () => {
  it('counts the lines in each sheet’s text area', () => {
    const layout = classifyLines(
      screen([
        { text: 'un', box: box(100), empty: false },
        { text: 'deux', box: box(880), empty: false },
        { text: 'trois', box: box(1120), empty: false },
      ]),
      margins,
    )
    expect(layout).toEqual({ pages: 2, sheets: 2, outside: [], linesPerPage: [2, 1] })
  })

  it('reports a line crossing a margin or lying in the gap', () => {
    const { outside } = classifyLines(
      screen([
        { text: 'bas', box: box(890), empty: false },
        { text: 'entre', box: box(1005, 10), empty: false },
      ]),
      margins,
    )
    expect(outside).toEqual(['bas… at 890px', 'entre… at 1005px'])
  })

  it('reports an empty line squeezed beside a band', () => {
    const { outside } = classifyLines(
      screen([
        // Indented by the first-line indent: still where text goes
        { text: '', box: box(1120, 20, 140), empty: true },
        { text: '', box: box(500, 20, 600), empty: true },
      ]),
      margins,
    )
    expect(outside).toEqual(['(empty line)… at 500px'])
  })
})

describe('lastLineOn', () => {
  it('finds the lowest line of text on a sheet', () => {
    const lines = [
      { text: 'haut', box: box(100), empty: false },
      { text: 'bas', box: box(880), empty: false },
      { text: '', box: box(890), empty: true },
      { text: 'suivante', box: box(1120), empty: false },
    ]
    expect(lastLineOn(screen(lines), 1)?.text).toBe('bas')
  })
})
