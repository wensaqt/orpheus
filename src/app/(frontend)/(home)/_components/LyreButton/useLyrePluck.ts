import { useCallback, useEffect, useRef } from 'react'

import { bentPath, restPath, STRING_BOTTOM, STRINGS } from './geometry'

// Vibration : oscillation amortie du point de pincement
const FREQ = 7
const DAMPING = 0.22
const DURATION = 1.1
// Opacité des cordes au repos, identique à .string dans LyreHalf.module.css
const STRING_REST_OPACITY = 0.65

type Pluck = { start: number; amp: number; y: number }

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Anime les cordes pincées en écrivant directement dans le DOM, sans re-render
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
      const t = (now - pluck.start) / 1000
      if (t > DURATION) {
        plucks.current[i] = null
        path.setAttribute('d', restPath(string))
        path.style.opacity = ''
        return
      }
      active = true
      const offset = pluck.amp * Math.exp(-t / DAMPING) * Math.cos(2 * Math.PI * FREQ * t)
      path.setAttribute('d', bentPath(string, offset, pluck.y))
      path.style.opacity = String(
        STRING_REST_OPACITY + (1 - STRING_REST_OPACITY) * Math.exp(-t / 0.4),
      )
    })
    frame.current = active ? requestAnimationFrame(step) : null
  }, [])

  const pluck = useCallback(
    (i: number, amp: number, y: number) => {
      if (prefersReducedMotion()) return
      const { top } = STRINGS[i]
      const margin = (STRING_BOTTOM - top) * 0.15
      plucks.current[i] = {
        start: performance.now(),
        amp,
        y: Math.min(Math.max(y, top + margin), STRING_BOTTOM - margin),
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
