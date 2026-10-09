import type { ReactNode } from 'react'

import { classNames } from '@front/_lib/classNames'

import styles from './Heading.module.css'

type HeadingProps = {
  children: ReactNode
  id?: string
  className?: string
  level: 1 | 2
  variant: 'page' | 'panel' | 'dialog'
}

export function Heading({ children, id, className, level, variant }: HeadingProps) {
  const Tag = level === 1 ? 'h1' : 'h2'
  return (
    <Tag id={id} className={classNames(styles.heading, className)} data-variant={variant}>
      {children}
    </Tag>
  )
}
