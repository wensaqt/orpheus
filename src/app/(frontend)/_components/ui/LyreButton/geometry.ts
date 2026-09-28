// Géométrie d'une demi-lyre (viewBox), l'axe de la lyre étant en x = W
export const W = 120
export const H = 300
export const STRING_BOTTOM = 250
const YOKE_START = 32
const YOKE_CENTER_Y = 44
const YOKE_EDGE_Y = 86
export const MAX_AMP = 12
export const BASE_AMP = 4

export type LyreString = { x: number; top: number; width: number }

// Joug parabolique : sommet au centre de la lyre, les cordes montent vers l'axe
export const yokeY = (x: number) =>
  YOKE_CENTER_Y + (YOKE_EDGE_Y - YOKE_CENTER_Y) * ((W - x) / (W - YOKE_START)) ** 2

// De l'axe vers l'extérieur : les plus longues (graves) sont les plus épaisses (épaisseurs en px)
export const STRINGS: LyreString[] = [111, 93, 75, 57].map((x, i) => ({
  x,
  top: yokeY(x),
  width: 8 - i * 0.9,
}))

export const FRAME_PATHS = [
  // Montant et corne
  'M 66 264 C 30 252, 14 200, 20 150 C 26 104, 40 84, 30 50 C 24 32, 14 24, 8 27',
  // Joug
  `M ${YOKE_START} ${YOKE_EDGE_Y} Q ${(YOKE_START + W) / 2} ${YOKE_CENTER_Y} ${W} ${YOKE_CENTER_Y}`,
  // Caisse
  'M 66 264 Q 90 276 120 276',
  // Cordier
  `M 52 ${STRING_BOTTOM} L ${W} ${STRING_BOTTOM}`,
]

export const restPath = ({ x, top }: LyreString) => `M ${x} ${top} L ${x} ${STRING_BOTTOM}`

// Courbe quadratique dont le sommet passe par (x + offset / 2, y)
export const bentPath = ({ x, top }: LyreString, offset: number, y: number) =>
  `M ${x} ${top} Q ${x + offset} ${2 * y - (top + STRING_BOTTOM) / 2} ${x} ${STRING_BOTTOM}`
