import { describe, expect, it } from 'vitest'

import {
  RULER_STEP,
  RULER_STEP_LARGE,
  rulerLabels,
  valueAfterKey,
  valueAt,
} from '@/app/(frontend)/compositions/[id]/_components/page/rulerGeometry'

describe('rulerLabels', () => {
  it('counts centimetres from the left margin, both ways', () => {
    // A4 (210 mm) with a 25 mm margin: 2 cm back into the margin, then 1 to 18 cm forward
    const labels = rulerLabels(210, 25)
    expect(labels.slice(0, 3)).toEqual([
      { at: 5, label: 2 },
      { at: 15, label: 1 },
      { at: 35, label: 1 },
    ])
    expect(labels.at(-1)).toEqual({ at: 205, label: 18 })
  })

  it('leaves the margin itself to its handle', () => {
    expect(rulerLabels(210, 20).some(({ at }) => at === 20 || at <= 0)).toBe(false)
  })
})

describe('valueAt', () => {
  const page = { width: 210, left: 25 }

  it('reads the left margin from the left edge, the right one from the right edge', () => {
    expect(valueAt('left', 30, page)).toBe(30)
    expect(valueAt('right', 180, page)).toBe(30)
  })

  it('reads the first-line indent from the left margin', () => {
    expect(valueAt('indent', 35, page)).toBe(10)
  })
})

describe('valueAfterKey', () => {
  const key = (name: string, shiftKey = false) => ({ key: name, shiftKey })

  it('moves a handle the way the arrow points', () => {
    expect(valueAfterKey('left', key('ArrowRight'), 25, 100)).toBe(25 + RULER_STEP)
    expect(valueAfterKey('right', key('ArrowRight'), 25, 100)).toBe(25 - RULER_STEP)
    expect(valueAfterKey('right', key('ArrowLeft', true), 25, 100)).toBe(25 + RULER_STEP_LARGE)
    expect(valueAfterKey('indent', key('ArrowRight'), 0, 50)).toBe(RULER_STEP)
  })

  it('raises and lowers like a slider, and goes to the ends', () => {
    expect(valueAfterKey('right', key('ArrowUp'), 25, 100)).toBe(25 + RULER_STEP)
    expect(valueAfterKey('left', key('PageDown'), 25, 100)).toBe(25 - RULER_STEP_LARGE)
    expect(valueAfterKey('left', key('Home'), 25, 100)).toBe(0)
    expect(valueAfterKey('left', key('End'), 25, 100)).toBe(100)
  })

  it('ignores other keys', () => {
    expect(valueAfterKey('left', key('a'), 25, 100)).toBeNull()
  })
})
