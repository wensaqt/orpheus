// Géométrie d'une demi-lyre (viewBox), l'axe de la lyre étant en x = W
export const W = 120
export const H = 300
export const STRING_BOTTOM = 250
const YOKE_CENTER_Y = 44
const YOKE_EDGE_Y = 86
// Amplitudes de vibration (viewBox) : au passage de la souris, elle croît avec la vitesse
export const BASE_AMP = 1
export const MAX_AMP = 3
// Au clic, l'accord est pincé plus fort
export const CHORD_AMP = 7

export type LyreString = { x: number; top: number; width: number }

type Point = [number, number]
type Cubic = [Point, Point, Point, Point]

// Montant et corne, en trois courbes de Bézier cubiques
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

// Abscisse du montant à la hauteur y (y décroît le long du segment), par dichotomie.
// Les traits qui s'y raccordent partent de ce point, sur la ligne centrale du montant :
// leur bout arrondi reste alors entièrement dans l'épaisseur du montant, sans bosse.
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

// Joug parabolique : sommet au centre de la lyre, les cordes montent vers l'axe
export const yokeY = (x: number) =>
  YOKE_CENTER_Y + (YOKE_EDGE_Y - YOKE_CENTER_Y) * ((W - x) / (W - YOKE_START)) ** 2

// De l'axe vers l'extérieur : les plus longues (graves) sont les plus épaisses (épaisseurs en px)
export const STRINGS: LyreString[] = [111, 93, 75, 57].map((x, i) => ({
  x,
  top: yokeY(x),
  width: 16 - i * 1.8,
}))

export const FRAME_PATHS = [
  // Montant et corne
  `M ${ARM[0][0].join(' ')} ` +
    ARM.map(([, ...points]) => `C ${points.map((p) => p.join(' ')).join(', ')}`).join(' '),
  // Joug
  `M ${YOKE_START} ${YOKE_EDGE_Y} Q ${(YOKE_START + W) / 2} ${YOKE_CENTER_Y} ${W} ${YOKE_CENTER_Y}`,
  // Caisse : part dans le prolongement du montant, arrive à l'horizontale sur l'axe
  'M 66 264 C 90 272, 105 276, 120 276',
  // Cordier
  `M ${TAILPIECE_START} ${STRING_BOTTOM} L ${W} ${STRING_BOTTOM}`,
]

export const restPath = ({ x, top }: LyreString) => `M ${x} ${top} L ${x} ${STRING_BOTTOM}`

// Courbe quadratique dont le sommet passe par (x + offset / 2, y)
export const bentPath = ({ x, top }: LyreString, offset: number, y: number) =>
  `M ${x} ${top} Q ${x + offset} ${2 * y - (top + STRING_BOTTOM) / 2} ${x} ${STRING_BOTTOM}`
