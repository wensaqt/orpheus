'use client'

import Link from 'next/link'
import React from 'react'

import styles from './LyreButton.module.css'
import { LyreHalf } from './LyreHalf'
import { LyreLabel } from './LyreLabel'
import type { LyreSide } from './types'
import { type LyreHandlers, useLyreInput } from './useLyreInput'
import { useLyrePluck } from './useLyrePluck'

type CommonProps = LyreHandlers & {
  text: string
  // Revealed on hover, below the rule
  subtitle?: string
  side?: LyreSide
  className?: string
}

// With href: a real link (prefetching, middle click); without: a button
type LyreButtonProps = CommonProps &
  (
    | { href: string }
    | ({ href?: undefined } & Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        keyof CommonProps | 'children'
      >)
  )

// Combines the playable half-lyre and its label in a button or a link
export function LyreButton(props: LyreButtonProps) {
  const {
    text,
    subtitle,
    side = 'left',
    className,
    onPointerEnter,
    onPointerDown,
    onPointerMove,
    onPointerLeave,
    onFocus,
    onBlur,
    ...rest
  } = props
  const { pathRefs, pluck } = useLyrePluck()
  const { svgRef, handlers } = useLyreInput({
    side,
    pluck,
    handlers: { onPointerEnter, onPointerDown, onPointerMove, onPointerLeave, onFocus, onBlur },
  })

  const shared = { className: [styles.button, className].filter(Boolean).join(' '), ...handlers }
  const content = (
    <>
      <LyreHalf side={side} svgRef={svgRef} stringRefs={pathRefs} />
      <LyreLabel side={side} title={text} subtitle={subtitle} />
    </>
  )

  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} {...shared}>
        {content}
      </Link>
    )
  }

  const { href: _href, type = 'button', ...buttonProps } = rest
  return (
    <button type={type} {...shared} {...buttonProps}>
      {content}
    </button>
  )
}
