// Geometry of a half-lyre (viewBox), with the lyre's axis at x = W
export const W = 120
export const H = 300
export const STRING_BOTTOM = 250
const YOKE_CENTER_Y = 44
const YOKE_EDGE_Y = 86
// Vibration amplitudes (viewBox): on mouse pass, it grows with speed
export const BASE_AMP = 1
export const MAX_AMP = 3
// On click, the chord is plucked harder
export const CHORD_AMP = 5

export type LyreString = { x: number; top: number; width: number }

type Point = [number, number]
type Cubic = [Point, Point, Point, Point]

// Arm and horn, as three cubic Bézier curves
const ARM: Cubic[] = [
  [
    [66, 264],
    [30, 252],
    [14, 200],
    [20, 150],
  ],
  [
    [20, 150],
    [26, 104],
    [40, 84],
    [30, 50],
  ],
  [
    [30, 50],
    [24, 32],
    [14, 24],
    [8, 27],
  ],
]

const cubicAt = ([p0, p1, p2, p3]: Cubic, t: number): Point => {
  const u = 1 - t
  const at = (k: 0 | 1) =>
    u ** 3 * p0[k] + 3 * u ** 2 * t * p1[k] + 3 * u * t ** 2 * p2[k] + t ** 3 * p3[k]
  return [at(0), at(1)]
}

// x of the arm at height y (y decreases along the segment), by bisection.
// Strokes joining the arm start from this point, on the arm's centre line:
// their rounded end then stays entirely within the arm's thickness, with no bump.
const armXAtY = (segment: Cubic, y: number) => {
  let [lo, hi] = [0, 1]
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (cubicAt(segment, mid)[1] > y) lo = mid
    else hi = mid
  }
  return cubicAt(segment, (lo + hi) / 2)[0]
}

const YOKE_START = armXAtY(ARM[1], YOKE_EDGE_Y)
const TAILPIECE_START = armXAtY(ARM[0], STRING_BOTTOM)

// Parabolic yoke: apex at the lyre's centre, the strings rise towards the axis
export const yokeY = (x: number) =>
  YOKE_CENTER_Y + (YOKE_EDGE_Y - YOKE_CENTER_Y) * ((W - x) / (W - YOKE_START)) ** 2

// From the axis outwards: the longest (lowest) are the thickest (widths in px)
export const STRINGS: LyreString[] = [111, 93, 75, 57].map((x, i) => ({
  x,
  top: yokeY(x),
  width: 16 - i * 1.8,
}))

export const FRAME_PATHS = [
  // Arm and horn
  `M ${ARM[0][0].join(' ')} ` +
    ARM.map(([, ...points]) => `C ${points.map((p) => p.join(' ')).join(', ')}`).join(' '),
  // Yoke
  `M ${YOKE_START} ${YOKE_EDGE_Y} Q ${(YOKE_START + W) / 2} ${YOKE_CENTER_Y} ${W} ${YOKE_CENTER_Y}`,
  // Body: continues from the arm, reaches the axis horizontally
  'M 66 264 C 90 272, 105 276, 120 276',
  // Tailpiece
  `M ${TAILPIECE_START} ${STRING_BOTTOM} L ${W} ${STRING_BOTTOM}`,
]

export const restPath = ({ x, top }: LyreString) => `M ${x} ${top} L ${x} ${STRING_BOTTOM}`

// Quadratic curve whose apex passes through (x + offset / 2, y)
export const bentPath = ({ x, top }: LyreString, offset: number, y: number) =>
  `M ${x} ${top} Q ${x + offset} ${2 * y - (top + STRING_BOTTOM) / 2} ${x} ${STRING_BOTTOM}`
