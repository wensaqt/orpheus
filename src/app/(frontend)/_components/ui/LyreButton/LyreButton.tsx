'use client'

import React, { useEffect, useId, useRef } from 'react'

import { FRAME_PATHS, H, restPath, STRING_BOTTOM, STRINGS, W, BASE_AMP, MAX_AMP  } from './geometry'
import styles from './LyreButton.module.css'
import { useLyrePluck } from './useLyrePluck'

type LyreButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string
  // Moitié de lyre dessinée contre le bord intérieur du bouton
  side?: 'left' | 'right'
}


export function LyreButton({
  text,
  side = 'left',
  className,
  type = 'button',
  onPointerEnter,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: LyreButtonProps) {
  const gradientId = `lyre-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const svgRef = useRef<SVGSVGElement>(null)
  const rect = useRef<DOMRect | null>(null)
  const lastX = useRef<number | null>(null)
  const timeouts = useRef<number[]>([])
  const { pathRefs, pluck } = useLyrePluck()

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

  function handlePointerEnter(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerEnter?.(e)
    rect.current = null
  }

  // Au clic ou au tap, toutes les cordes sonnent ensemble, comme un accord
  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(e)
    const { x, y } = toLyre(e)
    lastX.current = x
    STRINGS.forEach((_, i) => pluck(i, 6, y))
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerMove?.(e)
    const { x, y } = toLyre(e)
    const prev = lastX.current
    lastX.current = x

    if (prev === null || prev === x) return

    STRINGS.forEach((string, i) => {
      const crossed = (string.x - prev) * (string.x - x) < 0
      if (crossed && y > string.top && y < STRING_BOTTOM) {
        pluck(i, Math.sign(x - prev) * Math.min(MAX_AMP, BASE_AMP + Math.abs(x - prev)), y)
      }
    })
  }

  function handlePointerLeave(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerLeave?.(e)
    lastX.current = null
  }

  function cancelGlissando() {
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
  }

  // Au clavier, glissando de gauche à droite
  function handleFocus(e: React.FocusEvent<HTMLButtonElement>) {
    onFocus?.(e)
    if (!e.currentTarget.matches(':focus-visible')) return
    cancelGlissando()
    const order = side === 'left' ? [3, 2, 1, 0] : [0, 1, 2, 3]
    timeouts.current = order.map((i, step) =>
      window.setTimeout(() => pluck(i, 6, H / 2), step * 70),
    )
  }

  function handleBlur(e: React.FocusEvent<HTMLButtonElement>) {
    onBlur?.(e)
    cancelGlissando()
  }

  return (
    <button
      type={type}
      className={[styles.button, styles[side], className].filter(Boolean).join(' ')}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      <svg ref={svgRef} className={styles.lyre} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
            y2={H}
          >
            <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="0.5" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {FRAME_PATHS.map((d) => (
          <path key={d} className={styles.frame} d={d} />
        ))}
        {STRINGS.map((string, i) => (
          <path
            key={string.x}
            ref={(el) => {
              pathRefs.current[i] = el
            }}
            className={styles.string}
            d={restPath(string)}
            stroke={`url(#${gradientId})`}
            strokeWidth={string.width}
          />
        ))}
      </svg>
      <span className={styles.text}>{text}</span>
    </button>
  )
}
