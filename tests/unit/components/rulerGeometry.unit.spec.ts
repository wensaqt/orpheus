import { describe, expect, it } from 'vitest'

import {
  handleMax,
  handlePosition,
  handleValue,
  RULER_STEP,
  RULER_STEP_LARGE,
  rulerLabels,
  valueAfterKey,
  valueAt,
  withHandleValue,
} from '@/app/(frontend)/compositions/[id]/_components/page/rulerGeometry'
import type { Layout } from '@/lib/layout'

// A4 with 25 mm margins and a 10 mm first-line indent
const layout: Layout = {
  page: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 25, right: 25, bottom: 25, left: 25 },
  },
  typography: { firstLineIndent: 10 },
}

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

describe('handles', () => {
  it('sit at their margin, the indent after the left margin', () => {
    expect(handlePosition('left', layout)).toBe(25)
    expect(handlePosition('right', layout)).toBe(185)
    expect(handlePosition('indent', layout)).toBe(35)
  })

  it('set what lies under them, the inverse of where they sit', () => {
    for (const handle of ['left', 'right', 'indent'] as const)
      expect(valueAt(handle, handlePosition(handle, layout), layout)).toBe(
        handleValue(handle, layout),
      )
  })

  it('know their bounds', () => {
    expect(handleMax('left', layout)).toBe(210 - 40 - 25)
    expect(handleMax('indent', layout)).toBe(80)
  })

  it('keep the layout fitted: wider margins shrink the indent', () => {
    const indented = withHandleValue('indent', layout, 80)
    expect(indented.typography.firstLineIndent).toBe(80)
    expect(withHandleValue('left', indented, 85).typography.firstLineIndent).toBe(50)
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
