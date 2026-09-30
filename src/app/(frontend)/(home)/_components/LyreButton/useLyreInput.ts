import React, { useEffect, useRef } from 'react'

import { BASE_AMP, CHORD_AMP, H, MAX_AMP, STRING_BOTTOM, STRINGS, W } from './geometry'
import type { LyreSide } from './types'

// Communs au bouton et au lien : la lyre se joue de la même façon sur les deux
export type LyreHandlers = Pick<
  React.HTMLAttributes<HTMLElement>,
  'onPointerEnter' | 'onPointerDown' | 'onPointerMove' | 'onPointerLeave' | 'onFocus' | 'onBlur'
>

type Options = {
  side: LyreSide
  pluck: (i: number, amp: number, y: number) => void
  // Gestionnaires du consommateur, appelés avant ceux de la lyre
  handlers: LyreHandlers
}

// Traduit pointeur et clavier en pincements : croisement de corde, accord au clic, glissando
export function useLyreInput({ side, pluck, handlers }: Options) {
  const svgRef = useRef<SVGSVGElement>(null)
  const rect = useRef<DOMRect | null>(null)
  const lastX = useRef<number | null>(null)
  const timeouts = useRef<number[]>([])

  // Le rect est mis en cache pour éviter un recalcul de layout à chaque pointermove
  useEffect(() => {
    const invalidate = () => {
      rect.current = null
    }
    window.addEventListener('resize', invalidate)
    window.addEventListener('scroll', invalidate, { capture: true, passive: true })
    return () => {
      window.removeEventListener('resize', invalidate)
      window.removeEventListener('scroll', invalidate, { capture: true })
      timeouts.current.forEach(clearTimeout)
    }
  }, [])

  // Coordonnées du pointeur dans le viewBox (le côté droit est dessiné en miroir)
  function toLyre(e: React.PointerEvent) {
    rect.current ??= svgRef.current!.getBoundingClientRect()
    const { left, top, width, height } = rect.current
    const x = ((e.clientX - left) / width) * W
    return { x: side === 'right' ? W - x : x, y: ((e.clientY - top) / height) * H }
  }

  function cancelGlissando() {
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
  }

  const lyreHandlers: Required<LyreHandlers> = {
    onPointerEnter(e) {
      handlers.onPointerEnter?.(e)
      rect.current = null
    },

    // Au clic ou au tap, toutes les cordes sonnent ensemble, comme un accord
    onPointerDown(e) {
      handlers.onPointerDown?.(e)
      const { x, y } = toLyre(e)
      lastX.current = x
      STRINGS.forEach((_, i) => pluck(i, CHORD_AMP, y))
    },

    onPointerMove(e) {
      handlers.onPointerMove?.(e)
      const { x, y } = toLyre(e)
      const prev = lastX.current
      lastX.current = x

      if (prev === null || prev === x) return

      STRINGS.forEach((string, i) => {
        const crossed = (string.x - prev) * (string.x - x) < 0
        if (crossed && y > string.top && y < STRING_BOTTOM) {
          pluck(i, Math.sign(x - prev) * Math.min(MAX_AMP, BASE_AMP + Math.abs(x - prev) * 0.25), y)
        }
      })
    },

    onPointerLeave(e) {
      handlers.onPointerLeave?.(e)
      lastX.current = null
    },

    // Au clavier, glissando de gauche à droite
    onFocus(e) {
      handlers.onFocus?.(e)
      if (!e.currentTarget.matches(':focus-visible')) return
      cancelGlissando()
      const order = side === 'left' ? [3, 2, 1, 0] : [0, 1, 2, 3]
      timeouts.current = order.map((i, step) =>
        window.setTimeout(() => pluck(i, 6, H / 2), step * 70),
      )
    },

    onBlur(e) {
      handlers.onBlur?.(e)
      cancelGlissando()
    },
  }

  return { svgRef, handlers: lyreHandlers }
}
