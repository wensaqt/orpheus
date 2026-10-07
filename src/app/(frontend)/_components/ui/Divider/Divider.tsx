import { classNames } from '@front/_lib/classNames'

import styles from './Divider.module.css'

type DividerProps = {
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

// Solid separator line
export function Divider({ orientation = 'vertical', className }: DividerProps) {
  return (
    <span
      className={classNames(styles.divider, styles[orientation], className)}
      aria-hidden="true"
    />
  )
}
