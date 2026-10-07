// How the lyre plays. Amplitudes are in viewBox units

// On a pointer's pass, the amplitude grows with its speed (the distance since the last move)
export const BASE_AMP = 1
export const MAX_AMP = 3
export const SPEED_TO_AMP = 0.25

// On click, the chord is plucked harder
export const CHORD_AMP = 5

// With the keyboard, a glissando: one string after the other, this many milliseconds apart
export const GLISSANDO_AMP = 6
export const GLISSANDO_STEP_MS = 70
