import React from 'react'

import styles from './Divider.module.css'

type DividerProps = {
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

// Trait séparateur plein
export function Divider({ orientation = 'vertical', className }: DividerProps) {
  return (
    <span
      className={[styles.divider, styles[orientation], className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}
