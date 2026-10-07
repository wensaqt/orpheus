import { clamp } from '@/lib/numbers'
import { useCallback, useEffect, useRef } from 'react'

import { MS_PER_SECOND } from '@front/_lib/time'

import { bentPath, restPath, STRING_BOTTOM, STRINGS } from './geometry'

// Vibration: damped oscillation of the pluck point
const FREQUENCY_HZ = 7
const DAMPING_SECONDS = 0.22
const DURATION_SECONDS = 1.1
// A plucked string fades back to the rest opacity supplied by its CSS
const OPACITY_DECAY_SECONDS = 0.4
// The pluck point stays this far (a share of the string's length) from either of its ends
const PLUCK_END_MARGIN = 0.15

type Pluck = { start: number; amp: number; y: number }

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Animates plucked strings by writing directly to the DOM, without re-rendering
export function useLyrePluck() {
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const plucks = useRef<(Pluck | null)[]>([])
  const frame = useRef<number | null>(null)

  const tick = useCallback(function step(now: number) {
    let active = false
    STRINGS.forEach((string, i) => {
      const pluck = plucks.current[i]
      const path = pathRefs.current[i]
      if (!pluck || !path) return
      const t = (now - pluck.start) / MS_PER_SECOND
      if (t > DURATION_SECONDS) {
        plucks.current[i] = null
        path.setAttribute('d', restPath(string))
        path.style.opacity = ''
        return
      }
      active = true
      const offset =
        pluck.amp * Math.exp(-t / DAMPING_SECONDS) * Math.cos(2 * Math.PI * FREQUENCY_HZ * t)
      path.setAttribute('d', bentPath(string, offset, pluck.y))
      path.style.opacity = `calc(var(--string-rest-opacity) + (1 - var(--string-rest-opacity)) * ${Math.exp(-t / OPACITY_DECAY_SECONDS)})`
    })
    frame.current = active ? requestAnimationFrame(step) : null
  }, [])

  const pluck = useCallback(
    (i: number, amp: number, y: number) => {
      if (prefersReducedMotion()) return
      const { top } = STRINGS[i]
      const margin = (STRING_BOTTOM - top) * PLUCK_END_MARGIN
      plucks.current[i] = {
        start: performance.now(),
        amp,
        y: clamp(y, top + margin, STRING_BOTTOM - margin),
      }
      frame.current ??= requestAnimationFrame(tick)
    },
    [tick],
  )

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    },
    [],
  )

  return { pathRefs, pluck }
}
