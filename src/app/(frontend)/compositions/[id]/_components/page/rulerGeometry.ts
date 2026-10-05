import { fitLayout, type Layout } from '@/lib/layout'
import { maxMargin, pageSize, withMargin } from '@/lib/pageFormats'
import { maxFirstLineIndent, withFirstLineIndent } from '@/lib/typography'

// The ruler's maths, in millimetres from the page's left edge. Pure: the ruler reads the pointer

// The ruler's handles: the side margins, and the first-line indent above the left one
export type RulerHandle = 'left' | 'right' | 'indent'

// Ruler numbers are centimetres
const CENTIMETRE = 10

// What the arrow keys move a margin by, and by with Shift (or Page Up / Page Down)
export const RULER_STEP = 1
export const RULER_STEP_LARGE = 5

/*
 * Where the numbers go: one per centimetre, counted from the left margin both ways, as in a
 * word processor (the margin itself is the handle, not a number)
 */
export function rulerLabels(width: number, left: number): { at: number; label: number }[] {
  const labels = []
  for (let cm = -Math.floor(left / CENTIMETRE); left + cm * CENTIMETRE < width; cm++) {
    const at = left + cm * CENTIMETRE
    if (cm !== 0 && at > 0) labels.push({ at, label: Math.abs(cm) })
  }
  return labels
}

// What each handle sets: a margin, or the first-line indent
export const handleValue = (handle: RulerHandle, { page, typography }: Layout) =>
  handle === 'indent' ? typography.firstLineIndent : page.margins[handle]

export const handleMax = (handle: RulerHandle, { page }: Layout) =>
  handle === 'indent' ? maxFirstLineIndent(page) : maxMargin(page, handle)

// The layout with a handle's new value, within its bounds and fitted (an indent that shrinks)
export function withHandleValue(handle: RulerHandle, layout: Layout, value: number): Layout {
  if (handle === 'indent') {
    return {
      ...layout,
      typography: withFirstLineIndent(layout.typography, layout.page, value),
    }
  }
  return fitLayout({ ...layout, page: withMargin(layout.page, handle, value) })
}

// Where a handle sits on the ruler: a margin from its edge, the indent from the left margin
export function handlePosition(handle: RulerHandle, layout: Layout) {
  const { left, right } = layout.page.margins
  if (handle === 'left') return left
  if (handle === 'right') return pageSize(layout.page).width - right
  return left + layout.typography.firstLineIndent
}

// What a handle dragged to this position sets (the inverse of handlePosition)
export function valueAt(handle: RulerHandle, position: number, layout: Layout) {
  if (handle === 'left') return position
  if (handle === 'right') return pageSize(layout.page).width - position
  return position - layout.page.margins.left
}

/*
 * The value after a key on a handle, or null for other keys. The side arrows move the handle
 * the way they point (so the right margin grows to the left); up and down, like any slider,
 * raise and lower the value.
 */
export function valueAfterKey(
  handle: RulerHandle,
  { key, shiftKey }: { key: string; shiftKey: boolean },
  value: number,
  max: number,
): number | null {
  const step = shiftKey ? RULER_STEP_LARGE : RULER_STEP
  const rightward = handle === 'right' ? -step : step
  const moves: Record<string, number> = {
    ArrowRight: value + rightward,
    ArrowLeft: value - rightward,
    ArrowUp: value + step,
    ArrowDown: value - step,
    PageUp: value + RULER_STEP_LARGE,
    PageDown: value - RULER_STEP_LARGE,
    Home: 0,
    End: max,
  }
  return key in moves ? moves[key] : null
}
