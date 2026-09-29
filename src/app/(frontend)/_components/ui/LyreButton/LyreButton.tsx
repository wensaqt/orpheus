'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import styles from './LyreButton.module.css'
import { LyreHalf } from './LyreHalf'
import { LyreLabel } from './LyreLabel'
import type { LyreSide } from './types'
import { useLyreInput } from './useLyreInput'
import { useLyrePluck } from './useLyrePluck'

type LyreButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string
  // Révélé au survol, sous le filet
  subtitle?: string
  side?: LyreSide
  // Navigue vers cette route au clic
  href?: string
}

// Assemble la demi-lyre jouable et son libellé dans un bouton
export function LyreButton({
  text,
  subtitle,
  side = 'left',
  href,
  className,
  onClick,
  type = 'button',
  onPointerEnter,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: LyreButtonProps) {
  const router = useRouter()
  const { pathRefs, pluck } = useLyrePluck()
  const { svgRef, handlers } = useLyreInput({
    side,
    pluck,
    handlers: { onPointerEnter, onPointerDown, onPointerMove, onPointerLeave, onFocus, onBlur },
  })

  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(' ')}
      {...handlers}
      onClick={(e) => {
        onClick?.(e)
        if (href && !e.defaultPrevented) router.push(href)
      }}
      {...props}
    >
      <LyreHalf side={side} svgRef={svgRef} stringRefs={pathRefs} />
      <LyreLabel side={side} title={text} subtitle={subtitle} />
    </button>
  )
}
