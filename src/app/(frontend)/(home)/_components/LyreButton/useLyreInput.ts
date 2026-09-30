import React, { useEffect, useRef } from 'react'

import { BASE_AMP, CHORD_AMP, H, MAX_AMP, STRING_BOTTOM, STRINGS, W } from './geometry'
import type { LyreSide } from './types'

// Shared by the button and the link: the lyre plays the same way on both
export type LyreHandlers = Pick<
  React.HTMLAttributes<HTMLElement>,
  'onPointerEnter' | 'onPointerDown' | 'onPointerMove' | 'onPointerLeave' | 'onFocus' | 'onBlur'
>

type Options = {
  side: LyreSide
  pluck: (i: number, amp: number, y: number) => void
  // Consumer handlers, called before the lyre's own
  handlers: LyreHandlers
}

// Turns pointer and keyboard input into plucks: string crossing, chord on click, glissando
export function useLyreInput({ side, pluck, handlers }: Options) {
  const svgRef = useRef<SVGSVGElement>(null)
  const rect = useRef<DOMRect | null>(null)
  const lastX = useRef<number | null>(null)
  const timeouts = useRef<number[]>([])

  // The rect is cached to avoid a layout recalculation on every pointermove
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

  // Pointer coordinates in the viewBox (the right side is drawn mirrored)
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

    // On click or tap, all strings sound together, like a chord
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

    // With the keyboard, glissando from left to right
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
