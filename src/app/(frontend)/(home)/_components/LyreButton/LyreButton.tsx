'use client'

import Link from 'next/link'
import React from 'react'

import { classNames } from '@front/_lib/classNames'

import styles from './LyreButton.module.css'
import { ChoiceIllustration } from './ChoiceIllustration'
import { LyreHalf } from './LyreHalf'
import { LyreLabel } from './LyreLabel'
import { LyreSide } from './types'
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
    side = LyreSide.Left,
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

  const shared = { className: classNames(styles.button, className), 'data-side': side, ...handlers }
  const content = (
    <>
      <LyreHalf side={side} svgRef={svgRef} stringRefs={pathRefs} />
      <span className={styles.mobileIllustration} aria-hidden="true">
        <ChoiceIllustration side={side} />
      </span>
      <LyreLabel side={side} title={text} subtitle={subtitle} />
      <span className={styles.mobileArrow} aria-hidden="true">
        ↗
      </span>
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
